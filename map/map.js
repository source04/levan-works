// Map logic reimplemented to match reference: D3 force simulation, straight links, drag, hover cascade.
// Styling and content (initialNodes, initialLinks) unchanged.

const overflow = 250
const nodeSize = 36 // used for link path offset in reference; we use center so path is (x,y) to (x,y)

document.addEventListener("DOMContentLoaded", function () {
  let simulation = null
  const layoutKey =
    window.innerWidth > 768 ? "levan_map_layout_desktop_v1" : "levan_map_layout_mobile_v1"

  function createStraightPath(source, target) {
    return `M${source.x + overflow},${source.y + overflow} L${target.x + overflow},${target.y + overflow}`
  }

  const createVisualisation = () => {
    const container = document.querySelector(".map__vis")
    container.innerHTML = ""

    let nodes = structuredClone(initialNodes)
    const nodesMap = nodes.reduce((acc, n) => {
      acc[n.id] = n
      return acc
    }, {})

    const links = initialLinks
      .filter((l) => nodesMap[l.source] && nodesMap[l.target])
      .map((l) => {
        const source = nodesMap[l.source]
        const target = nodesMap[l.target]
        if (!source.links) source.links = []
        if (!target.links) target.links = []
        source.links.push(target.id)
        target.links.push(source.id)
        return { source, target }
      })

    const width = container.getBoundingClientRect().width
    const height = container.getBoundingClientRect().height

    const distance = width > 768 ? 70 : 30

    // Seed positions from saved layout so layout is stable across refreshes
    try {
      const raw = window.localStorage && window.localStorage.getItem(layoutKey)
      if (raw) {
        const saved = JSON.parse(raw)
        nodes.forEach((n) => {
          const p = saved[n.id]
          if (p && typeof p.x === "number" && typeof p.y === "number") {
            n.x = p.x
            n.y = p.y
          }
        })
      }
    } catch (e) {}

    // SVG for links (reference: .map-lines)
    const svg = d3
      .select(container)
      .append("svg")
      .attr("class", "links")
      .attr("width", width + overflow * 2)
      .attr("height", height + overflow * 2)
      .append("g")

    const link = svg
      .selectAll(".link")
      .data(links)
      .join("path")
      .attr("class", "link")
      .attr("data-from", (d) => d.source.id)
      .attr("data-to", (d) => d.target.id)

    // Node elements (reference: div.node with drag)
    const node = d3
      .select(container)
      .selectAll(".node")
      .data(nodes)
      .join("div")
      .attr("class", (d) => `node node--${d.type || "field"}`)
      .attr("data-id", (d) => d.id)
      .each(function (d, i) {
        const el = d3.select(this)
        let scale = 1 - (1 - (d.weight || 1)) * 0.6
        if (d.type === "movement" || d.type === "person") scale = 1
        nodes[i].scale = scale
        // Collision radius so nodes don't overlap (approx half-width of label + padding)
        nodes[i].radius = Math.max(36, 18 + (d.name || "").length * 2.2) * scale
        el.attr("style", `--scale: ${scale}`)
          .append("div")
          .attr("class", "node__body")
          .text(d.name)
          .on("mouseover", function () {
            container.classList.add("map__vis--hover")
            document
              .querySelectorAll(
                `.link[data-from="${d.id}"], .link[data-to="${d.id}"]`
              )
              .forEach((e) => e.classList.add("link--hover"))
            this.closest(".node").classList.add("node--hover")
            ;(d.links || []).forEach((id) => {
              document.querySelectorAll(`.node[data-id="${id}"]`).forEach((e) => e.classList.add("node--hover-1"))
              document
                .querySelectorAll(`.link[data-from="${id}"], .link[data-to="${id}"]`)
                .forEach((e) => e.classList.add("link--hover-1"))
              const n1 = nodes.find((n) => n.id === id)
              if (n1) {
                ;(n1.links || []).forEach((id2) => {
                  document.querySelectorAll(`.node[data-id="${id2}"]`).forEach((e) => e.classList.add("node--hover-2"))
                  document
                    .querySelectorAll(`.link[data-from="${id2}"], .link[data-to="${id2}"]`)
                    .forEach((e) => e.classList.add("link--hover-2"))
                  const n2 = nodes.find((n) => n.id === id2)
                  ;((n2 && n2.links) || []).forEach((id3) => {
                    document.querySelectorAll(`.node[data-id="${id3}"]`).forEach((e) => e.classList.add("node--hover-3"))
                    document
                      .querySelectorAll(`.link[data-from="${id3}"], .link[data-to="${id3}"]`)
                      .forEach((e) => e.classList.add("link--hover-3"))
                  })
                })
              }
            })
          })
          .on("mouseout", function () {
            container.classList.remove("map__vis--hover")
            container.querySelectorAll(".link").forEach((e) => {
              e.classList.remove("link--hover", "link--hover-1", "link--hover-2", "link--hover-3")
            })
            container.querySelectorAll(".node").forEach((e) => {
              e.classList.remove("node--hover", "node--hover-1", "node--hover-2", "node--hover-3")
            })
          })
      })
      .call(
        d3
          .drag()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on("drag", (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null
            d.fy = null
          })
      )

    simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3.forceLink(links).id((d) => d.id).distance(distance).strength(0.1)
      )
      .force(
        "charge",
        d3.forceManyBody().strength(-400).distanceMax(300).distanceMin(10)
      )
      .force(
        "collision",
        d3.forceCollide().radius((d) => d.radius || 40)
      )
      .force("center", d3.forceCenter(width / 2, height / 2))
      .on("tick", () => {
        link.attr("d", (d) => createStraightPath(d.source, d.target))
        node.attr(
          "style",
          (d) => `--scale: ${d.scale}; transform: translate(${d.x}px, ${d.y}px);`
        )
      })
      .on("end", () => {
        document.querySelector(".map__vis-loading")?.remove()
        try {
          const toSave = {}
          nodes.forEach((d) => {
            if (d.id) toSave[d.id] = { x: d.x, y: d.y }
          })
          if (window.localStorage) {
            window.localStorage.setItem(layoutKey, JSON.stringify(toSave))
          }
        } catch (e) {}
      })
  }

  createVisualisation()

  function debounce(fn, ms) {
    let t
    return (...args) => {
      clearTimeout(t)
      t = setTimeout(() => fn.apply(this, args), ms)
    }
  }

  window.addEventListener("resize", debounce(createVisualisation, 200))
})
