// How much the canvas and svg elements should go over the vis
const overflow = 250

document.addEventListener("DOMContentLoaded", function () {
  var d3cola = cola.d3adaptor(d3)

  const createVisualisation = () => {
    if (d3cola) {
      d3cola.stop()
      d3cola = null
    }

    d3cola = cola.d3adaptor(d3)

    document.querySelector(".map__vis").innerHTML = ""
    document.querySelector(".map__vis").classList.add("map__vis--animating")
    let nodes = structuredClone(initialNodes)

    let nodesMap = nodes.reduce((map, node) => {
      map[node.id] = node
      return map
    }, {})

    const links = initialLinks
      .map(l => {
        // Skip links where either node doesn't exist
        if (!nodesMap[l.source] || !nodesMap[l.target]) {
          return null
        }

        nodes = nodes.map(n => {
          if (n.id === l.source) {
            n.links ? n.links.push(l.target) : (n.links = [l.target])
          }
          if (n.id === l.target) {
            n.links ? n.links.push(l.source) : (n.links = [l.source])
          }

          return n
        })

        return {
          source: nodesMap[l.source],
          target: nodesMap[l.target],
        }
      })
      .filter(Boolean) // Remove null entries

    // set the dimensions and margins of the graph
    const margin = { sides: 0, top: 0, bottom: 0 }
    const width = document.querySelector(".map__vis").getBoundingClientRect().width
    const height = document.querySelector(".map__vis").getBoundingClientRect().height

    let baseScale = 1
    let linkDistance = 30
    let nodeMargin = 20

    if (width < 700) {
      linkDistance = 20
      baseScale = 0.9
      nodeMargin = 15
    }

    if (width < 550) {
      linkDistance = 12
      baseScale = 0.8
      nodeMargin = 15
    }

    // append the svg object to the body of the page
    const svg = d3
      .select(".map__vis")
      .append("svg")
      .attr("class", "links")
      .attr("width", width + overflow * 2)
      .attr("height", height + overflow * 2)
      .append("g")

    const canvasEl = d3
      .select(".map__vis")
      .append("canvas")
      .attr("class", "blurs")
      .attr("width", width + overflow * 2)
      .attr("height", height + overflow * 2)
      .node()

    const ctx = canvasEl.getContext("2d")
    ctx.fillStyle = "white"
    ctx.fillRect(0, 0, canvasEl.width, canvasEl.height)

    d3cola.size([width, height])

    var nodeRadius = 50,
      realGraphNodes = nodes.slice(0),
      fixedNode = { fixed: true, fixedWeight: 500 },
      topLeft = { ...fixedNode, x: margin.sides, y: margin.top },
      tlIndex = nodes.push(topLeft) - 1,
      bottomRight = {
        ...fixedNode,
        x: margin.sides + (width - 2 * margin.sides),
        y: margin.top + (height - margin.top - margin.bottom),
      },
      brIndex = nodes.push(bottomRight) - 1,
      constraints = []

    for (var i = 0; i < realGraphNodes.length; i++) {
      constraints.push({ axis: "x", type: "separation", left: tlIndex, right: i, gap: nodeRadius })
      constraints.push({ axis: "y", type: "separation", left: tlIndex, right: i, gap: nodeRadius })
      constraints.push({ axis: "x", type: "separation", left: i, right: brIndex, gap: nodeRadius })
      constraints.push({ axis: "y", type: "separation", left: i, right: brIndex, gap: nodeRadius })
    }

    // Initialize the links
    const link = svg
      .selectAll(".link")
      .data(links)
      .join("path")
      .each(function (d) {
        d3.select(this).attr("class", "link").attr("data-from", d.source.id).attr("data-to", d.target.id)
      })

    // Initialize the nodes
    const node = d3
      .select(".map__vis")
      .selectAll("div")
      .data(nodes)
      .join("div")
      .each(function (d, i) {
        let w = d.weight || 1
        let nW = 1 - w
        let scale = 1.0 - nW * 0.6

        if (d.type === "movement" || d.type === "person") {
          scale = 1
        }

        nodes[i].scale = scale * baseScale

        let colors = [
          "rgba(250, 216, 177, 0.35)",  // #FAD8B1 peachy beige
          "rgba(214, 224, 240, 0.4)",   // #D6E0F0 light blue
        ]
        let color = colors[Math.floor(Math.random() * colors.length)]

        nodes[i].color = color

        d3.select(this)
          .attr("style", `--scale: ${scale}`)
          .attr("class", `node node--${d.type || "field"} ${d.fixed ? "node--fixed" : ""}`)
          .attr("data-id", d.id)
          .append("div")
          .attr("class", `node__body`)
          .text(d.name)
          .on("mouseover", () => {
            document.querySelector(".map__vis").classList.add("map__vis--hover")
            document.querySelectorAll(".link[data-from='" + d.id + "'], .link[data-to='" + d.id + "']").forEach(e => {
              e.classList.add("link--hover")
            })

            this.classList.add("node--hover")

            d.opacity = 1

            d.links.forEach(l => {
              document.querySelectorAll(".node[data-id='" + l + "']").forEach(e => {
                e.classList.add("node--hover-1")
              })
              document.querySelectorAll(".link[data-from='" + l + "'], .link[data-to='" + l + "']").forEach(e => {
                e.classList.add("link--hover-1")
              })

              let no = node.filter(n => n.id === l)
              no.each(n => {
                n.opacity = 0.7

                n.links.forEach(l => {
                  document.querySelectorAll(".node[data-id='" + l + "']").forEach(e => {
                    e.classList.add("node--hover-2")
                  })
                  document.querySelectorAll(".link[data-from='" + l + "'], .link[data-to='" + l + "']").forEach(e => {
                    e.classList.add("link--hover-2")
                  })

                  no = node.filter(n => n.id === l)

                  no.each(n => {
                    if (!n.opacity) {
                      n.opacity = 0.4
                    }

                    n.links.forEach(l => {
                      document.querySelectorAll(".node[data-id='" + l + "']").forEach(e => {
                        e.classList.add("node--hover-3")
                      })
                      document
                        .querySelectorAll(".link[data-from='" + l + "'], .link[data-to='" + l + "']")
                        .forEach(e => {
                          e.classList.add("link--hover-3")
                        })

                      no = node.filter(n => n.id === l)

                      no.each(n => {
                        if (!n.opacity) {
                          n.opacity = 0.2
                        }
                      })
                    })
                  })
                })
              })
            })

            node.each(n => {
              if (!n.opacity) {
                n.opacity = 0.05
              }
            })

            renderCanvas(node)
          })
          .on("mouseout", () => {
            document.querySelector(".map__vis").classList.remove("map__vis--hover")
            document.querySelectorAll(".link").forEach(e => {
              e.classList.remove("link--hover")
              e.classList.remove("link--hover-1")
              e.classList.remove("link--hover-2")
              e.classList.remove("link--hover-3")
            })
            document.querySelectorAll(".node").forEach(e => {
              e.classList.remove("node--hover")
              e.classList.remove("node--hover-1")
              e.classList.remove("node--hover-2")
              e.classList.remove("node--hover-3")
            })

            node.each(n => {
              n.opacity = null
            })
          })

        nodes[i].width = this.querySelector(".node__body").getBoundingClientRect().width * baseScale + nodeMargin * 2
        nodes[i].height = this.querySelector(".node__body").getBoundingClientRect().height * baseScale + nodeMargin * 2
      })

    d3cola
      .nodes(nodes)
      .links(links)
      .constraints(constraints)
      .handleDisconnected(false)
      .symmetricDiffLinkLengths(linkDistance)
      .avoidOverlaps(true)
      .start(30, 30, 30, 30)

    // Entrance animation: begin staggering node reveals while Cola settles.
    // Nodes fade in via CSS transition while still physically moving on each tick.
    const nodeEls = []
    node.each(function (d) {
      if (!d.fixed) nodeEls.push(this)
    })
    nodeEls.forEach((el, i) => {
      setTimeout(() => {
        el.classList.add("node--entered")
      }, 300 + i * 40)
    })

    var lineFunction = d3
      .line()
      .x(function (d) {
        return d.x + overflow
      })
      .y(function (d) {
        return d.y + overflow
      })

    var routeEdges = function () {
      d3cola.prepareEdgeRouting()
      link.attr("d", function (d) {
        return lineFunction(d3cola.routeEdge(d, 0))
      })
    }

    var renderCanvas = nodes => {
      ctx.globalCompositeOperation = "source-over"

      ctx.fillStyle = "white"
      ctx.fillRect(0, 0, canvasEl.width, canvasEl.height)

      nodes.each(function (d) {
        if (d.fixed) {
          return
        }

        let cx = d.bounds.cx() + overflow
        let cy = d.bounds.cy() + overflow
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 250)

        // Add color stops: center (full intensity based on opacity), edge (transparent)
        gradient.addColorStop(
          0,
          d.color
            .replace("0.35", 0.35 * (d.opacity ?? 0))
            .replace("0.4", 0.4 * (d.opacity ?? 0))
            .replace("0.3", 0.3 * (d.opacity ?? 0)),
        )
        gradient.addColorStop(1, d.color.replace("0.35", "0").replace("0.4", "0").replace("0.3", "0"))

        ctx.fillStyle = gradient
        ctx.fillRect(cx - 250, cy - 250, 500, 500)
      })
    }

    d3cola
      .on("tick", function () {
        ctx.globalCompositeOperation = "source-over"

        ctx.fillStyle = "white"
        ctx.fillRect(0, 0, canvasEl.width, canvasEl.height)

        node.each(function (d) {
          d.innerBounds = d.bounds.inflate(-nodeMargin)
        })

        renderCanvas(node)

        node.attr("style", d => {
          return `--scale: ${d.scale}; transform: translate(${d.x}px, ${d.y}px);`
        })
      })
      .on("end", () => {
        document.querySelector(".map__vis-loading")?.remove()

        const container = document.querySelector(".map__vis")
        const realNodes = nodes.filter((d) => !d.fixed)

        if (realNodes.length > 0) {
          // 1. Find content bounds
          const minY = Math.min(...realNodes.map((d) => d.y - d.height / 2))
          const maxY = Math.max(...realNodes.map((d) => d.y + d.height / 2))
          const contentHeight = maxY - minY

          // 2. Shift ALL nodes so the topmost node edge starts at y = 0
          //    This prevents any node from rendering above .map__vis
          const yShift = -minY
          nodes.forEach(d => {
            d.y += yShift
            if (d.bounds) {
              d.bounds.y += yShift
              d.bounds.Y += yShift
            }
            if (d.innerBounds) {
              d.innerBounds.y += yShift
              d.innerBounds.Y += yShift
            }
          })

          // 3. Re-render node positions with shifted coordinates
          node.attr("style", d => {
            return `--scale: ${d.scale}; transform: translate(${d.x}px, ${d.y}px);`
          })

          // 4. Route edges using the shifted positions
          routeEdges()

          // 5. Resize container to fit content (container padding provides spacing)
          const newHeight = contentHeight
          container.style.height = newHeight + "px"
          container.style.minHeight = "0"

          // 6. Resize SVG and canvas to match
          const svgEl = container.querySelector("svg.links")
          if (svgEl) {
            svgEl.setAttribute("width", width + overflow * 2)
            svgEl.setAttribute("height", newHeight + overflow * 2)
          }

          canvasEl.width = width + overflow * 2
          canvasEl.height = newHeight + overflow * 2
          canvasEl.style.width = (width + overflow * 2) + "px"
          canvasEl.style.height = (newHeight + overflow * 2) + "px"

          renderCanvas(node)
        }

        // 7. Entrance animation: stagger-reveal links (nodes already fading in from start)
        let linkDelay = 100
        link.each(function (d, i) {
          const el = this
          setTimeout(() => {
            el.classList.add("link--entered")
          }, linkDelay + i * 20)
        })

        // Remove animation class after all elements have faded in
        const linkAnimEnd = linkDelay + links.length * 20 + 600
        setTimeout(() => {
          container.classList.remove("map__vis--animating")
          node.classed("node--entered", false)
          link.classed("link--entered", false)
        }, linkAnimEnd)
      })
  }

  createVisualisation()

  function debounce(func, timeout = 300) {
    let timer
    return (...args) => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        func.apply(this, args)
      }, timeout)
    }
  }

  const debounceCreateVisualisation = debounce(createVisualisation, 200)

  window.addEventListener("resize", () => {
    debounceCreateVisualisation()
  })
})
