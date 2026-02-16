// File: components/Map.js
import * as d3 from 'd3';
import Map from './Map.js';
import Router from '../utils/Router.js';
import Data from '../utils/Data.js';
import Slider from './Slider.js';

const Page = {

	pageOpen: false,
	firstLoad: true,
	visitedUris: [],

    initialize(path) {
		// only runs once
		this.setupListeners();
		// this.animateHomePage(path);
	},

	animateHomePage(path) {
		// if theres no path, its the home page, and the open page will run instead
		// if (!path) {
		// 	const page = document.querySelector('.page');
		// 	const pageContainer = document.querySelector('.page-container');
		// 	let actualHeight = 0;

		// 	// briefly show it to get the actual height
		// 	page.style.height = 'auto';
		// 	actualHeight = pageContainer.offsetHeight;
		// 	page.style.height = '0px';
			
		// 	setTimeout(() => {
		// 		page.style.height = `${actualHeight}px`;
		// 	}, 2000);
		// }
	},

	setupListeners() {
		document.addEventListener('click', (event) => {
			const target = event.target;
			if (target.classList.contains('a')) {
				event.preventDefault();
			}

			if (target.closest('.tab-titles')) {
				const container = target.closest('.tabs');
                if(target.closest('.page-tab').classList.contains('tab-open')) {
                    target.closest('.page-tab').classList.remove('tab-open');
                } else {
                    container.querySelectorAll('.page-tab').forEach(tab => tab.classList.remove('tab-open'));
				    target.closest('.page-tab').classList.add('tab-open');
                }

				Page.animatePageHeight();

				event.preventDefault();
			}

			if (target.closest('.close-page') || target.closest('.header-content') || target.closest('.page-content .page-titles-type')) {
				Map.resetMap();
				Page.closePage();
				event.preventDefault();
			}

			if (target.closest('.back-page')) {
				window.history.back();
				event.preventDefault();
			}

			if(target.closest('.read-more')) {
				target.closest('.page-content-inner').classList.add('extended-description-open');
				target.closest('.read-more').remove();
				Page.animatePageHeight();
				event.preventDefault();
			}

		});

		document.addEventListener('mouseenter', (event) => {
			const target = event.target;
	
			// Ensure the event target is an Element and has classList
			if (target instanceof Element && (target.classList.contains('media-item') || target.classList.contains('page-container'))) {
				const hoverItems = document.querySelectorAll('.media-item, .page-container');
				let highestZIndex = 0;
	
				// Find the highest z-index among all hover items
				hoverItems.forEach((item) => {
					const zIndex = window.getComputedStyle(item).zIndex;
					if (!isNaN(zIndex) && zIndex !== 'auto') {
						highestZIndex = Math.max(highestZIndex, Number(zIndex));
					}
				});
	
				// Set the z-index of the hovered item to be one more than the highest
				target.style.zIndex = highestZIndex + 1;
			}
		}, true);
		
		window.addEventListener('resize', () => {
			if (Page.pageOpen) {
				Page.animatePageHeight();
			}
		});

		
	},

	updateVisitedLinks(uri) {
		
		Page.visitedUris.push(uri);
		
		document.querySelectorAll('.index-link').forEach((link) => {
			const linkUri = link.getAttribute('data-uri');
			if(Page.visitedUris.includes(linkUri)){
				link.classList.add('visited');
			}
		});
		
		document.querySelectorAll('.node').forEach((node) => {
			const nodeUri = node.getAttribute('data-uri');
			if(Page.visitedUris.includes(nodeUri)){
				node.classList.add('visited');
			}
		});

	},



    openPage(uri) {
		if(uri === 'nodes/information'){
			Page.buildPage(uri, true);
			document.body.classList.add('page-open', 'information-open');
			Page.animatePageHeight();
		} else {
			Page.buildPage(uri);
			document.body.classList.add('page-open');
			Page.animatePageHeight();
		}

		Page.pageOpen = true;
		
		Page.updateVisitedLinks(uri);
		
        // Map.resizeMap(pageWidth);
    },

    closePage() {
		Page.pageOpen = false;

        document.body.classList.remove('page-open', 'information-open');

		const page = document.querySelector('.page');
		const existingMedia = page.querySelectorAll('.media-item');
		const delay = existingMedia.length > 0 ? 400 : 0;
	
		existingMedia.forEach((item, index) => {
			item.classList.remove('show-media-item');
		});
	
		setTimeout(() => {
			existingMedia.forEach((item) => {
				item.remove();
			});
		}, delay);

		Page.animatePageHeight();

        // Map.resizeMap(1);
    },

	buildMedia(pageData) {

		const page = document.querySelector('.page');
		const mainContentInner = document.querySelector('.main-content-inner .page-content');

		const media = pageData.media;
	
		const existingMedia = page.querySelectorAll('.media-item');
		let delay;
		
		if(Page.firstLoad){
			delay = window.innerWidth > 768 ? 1500 : 0;
		} else {
			delay = existingMedia.length > 0 && window.innerWidth > 768 ? 400 : 0;
		}
		
	
		existingMedia.forEach((item, index) => {
			item.classList.remove('show-media-item');
		});
	
		setTimeout(() => {
			// Clear the container first
			existingMedia.forEach((item) => {
				item.remove();
			});
	
			// Shuffle index classes
			const indexClasses = ['media-index-1', 'media-index-2', 'media-index-3', 'media-index-4'];
	
			// Loop through each media item and create HTML
			media.forEach((item, index) => {
				const mediaItem = document.createElement('div');
				mediaItem.classList.add('media-item');
				mediaItem.classList.add(indexClasses[index % 4]);
	
				// Check the type and create appropriate HTML
				if (item.type.startsWith('image')) {
					mediaItem.classList.add('media-image');
					const img = document.createElement('img');
					img.src = item.smallImage;
					img.alt = item.alt || '';
					img.classList.add('media-image');
	
					// Add event listener for image load
					img.addEventListener('load', () => {
						const width = img.naturalWidth;
						const height = img.naturalHeight;
						const ratio = width / height;
						if (ratio > 1) {
							mediaItem.classList.add('media-landscape');
						} else {
							mediaItem.classList.add('media-portrait');
						}
						setTimeout(() => {
							mediaItem.classList.add('show-media-item');
						}, 100);
					});
	
					mediaItem.appendChild(img);
				} else if (item.type.startsWith('video')) {
					mediaItem.classList.add('media-video');

					const video = document.createElement('video');
					
					video.setAttribute('autoplay', 'true');
					video.setAttribute('muted', 'true');
					video.setAttribute('playsinline', 'true');
					video.setAttribute('loop', 'true');
					video.setAttribute('preload', 'true');

					video.muted = true;

					video.classList.add('media-video');
					video.src = item.url;

					// Add event listener for video loadeddata
					video.addEventListener('canplay', () => {
						const width = video.videoWidth;
						const height = video.videoHeight;
						const ratio = width / height;
						if (ratio > 1) {
							mediaItem.classList.add('media-landscape');
						} else {
							mediaItem.classList.add('media-portrait');
						}
						setTimeout(() => {
							mediaItem.classList.add('show-media-item');
						}, 100);
						video.play();
					});
	
					video.addEventListener('error', (e) => {
						console.error('Video failed to load:', e);
					});
	
					mediaItem.appendChild(video);

					setTimeout(() => {
						video.play();
					}, 100);
				}

				// Add external link button if there is an externalLink
				if (item.externalLink) {
					const button = document.createElement('a');
					button.textContent = item.externalLinkText && item.externalLinkText.trim() !== '' ? item.externalLinkText : 'view link';
					button.target = '_blank';
					button.href = item.externalLink;
					mediaItem.appendChild(button);
				}
	
				// Append the media item to the container
				if(window.innerWidth > 768){



					page.appendChild(mediaItem);
					
					// on click of media item, extract the image url, add a niv to the page called 'gallery' and add the image to the gallery at the exact size and exact same position as the media item, then after 500ms scale it to fit within either the width or height of the page. also ensure that the appended image is centred in the viewport perfectly according to its new width and height

					mediaItem.addEventListener('click', (e) => {
						const image = mediaItem.querySelector('img');
						const video = mediaItem.querySelector('video');
						const media = image || video;
						const mediaRect = media.getBoundingClientRect(); // Get the media's original size and position
					
						// Clone the media element
						const clonedMedia = media.cloneNode(true);
					
						// Create the gallery container
						const gallery = document.createElement('div');
						gallery.classList.add('gallery');
						gallery.appendChild(clonedMedia);
						document.body.appendChild(gallery);
					
						// Add the 'media-open' class to the clicked media item
						mediaItem.classList.add('media-open');
					
						// Set the cloned media's initial size and position to match the original
						clonedMedia.style.width = `${mediaRect.width}px`;
						clonedMedia.style.height = `${mediaRect.height}px`;
						clonedMedia.style.top = `${mediaRect.top}px`;
						clonedMedia.style.left = `${mediaRect.left}px`;
					
						// Animate the media to the full-screen gallery position
						setTimeout(() => {
							gallery.classList.add('gallery-in');
						}, 10);
					
						setTimeout(() => {
							const pageWidth = window.innerWidth - 100; // 50px buffer on left and right
							const pageHeight = window.innerHeight - 100; // 50px buffer on top and bottom
							const pageRatio = pageWidth / pageHeight;
							const mediaRatio = mediaRect.width / mediaRect.height;
					
							// Calculate the new size and position for the cloned media
							let newWidth, newHeight;
							if (mediaRatio > pageRatio) {
								newWidth = pageWidth;
								newHeight = pageWidth / mediaRatio;
							} else {
								newHeight = pageHeight;
								newWidth = pageHeight * mediaRatio;
							}
					
							// Center the cloned media within the viewport
							const top = (window.innerHeight - newHeight) / 2;
							const left = (window.innerWidth - newWidth) / 2;
					
							// Animate the cloned media to the new size and position
							clonedMedia.style.width = `${newWidth}px`;
							clonedMedia.style.height = `${newHeight}px`;
							clonedMedia.style.top = `${top}px`;
							clonedMedia.style.left = `${left}px`;
						}, 100); // 100ms delay before the animation starts
					
						// Function to close the gallery (used by both click and Escape key events)
						function closeGallery() {
							// Animate the cloned media back to its original position and size
							clonedMedia.style.width = `${mediaRect.width}px`;
							clonedMedia.style.height = `${mediaRect.height}px`;
							clonedMedia.style.top = `${mediaRect.top}px`;
							clonedMedia.style.left = `${mediaRect.left}px`;
					
							// Remove 'gallery-in' class to trigger reverse transition
							gallery.classList.remove('gallery-in');
					
							// Remove the gallery and 'media-open' class after the transition ends
							setTimeout(() => {
								mediaItem.classList.remove('media-open');
								gallery.remove();
								document.removeEventListener('keydown', handleEscapeKey); // Remove Escape key listener
							}, 500); // Match the transition duration in CSS
						}
					
						// Close the gallery when clicking on the gallery background
						gallery.addEventListener('click', (e) => {
							closeGallery();
						});
					
						// Handle Escape key to close the gallery
						function handleEscapeKey(e) {
							if (e.key === 'Escape') {
								closeGallery();
							}
						}
					
						// Add the keydown event listener for the Escape key
						document.addEventListener('keydown', handleEscapeKey);
					});
					



				} else {

					// Handle mobile view tab content
					let tabContainer = mainContentInner.querySelector('.tabs');
					
					if (!tabContainer) {
						tabContainer = document.createElement('div');
						tabContainer.classList.add('tabs');
						mainContentInner.appendChild(tabContainer);
					}
	
					let mediaTab = tabContainer.querySelector('.page-tab.tab-media');

					if (!mediaTab) {
						mediaTab = document.createElement('div');
						mediaTab.classList.add('page-tab', 'tab-media');
						mediaTab.innerHTML = `
							<div class="tab-titles">
								<span class="tab-icon icon-media"></span>
								<span class="tab-title">Media</span>
								<span class="tab-indicator"></span>
							</div>
							<div class="tab-content">
								<ul class="list"></ul>
							</div>
						`;
						tabContainer.prepend(mediaTab);
					}
	
					const list = mediaTab.querySelector('.tab-content .list');
					const listItem = document.createElement('li');
					listItem.appendChild(mediaItem);
					list.appendChild(listItem);

				}
			});
		}, delay);
	},
	
	// Function to shuffle an array
	shuffleArray(array) {
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[array[i], array[j]] = [array[j], array[i]];
		}
	},

	buildPage(uri, isInformation) {

		const pageData = this.findPageDataByUri(uri);
	
		if (pageData) {

			

			// Remove existing .page-content
			const mainContentInner = document.querySelector('.main-content-inner');
			const existingContent = mainContentInner.querySelector('.page-content');
			
			if (existingContent) {
				mainContentInner.removeChild(existingContent);
			}
	
			// Create new .page-content
			const pageContent = document.createElement('div');
			pageContent.className = 'page-content group';
	
			// Add titles
			let titlesHTML = `
				<div class="page-titles">
					<div class="page-titles-type">
						<span class="tab-icon icon-${pageData.type}"></span>
						<span class="tab-title">${pageData.type || ''}</span>
						<button class="back-page"></button>
						<button class="close-page"></button>
					</div>
					<div class="page-main-title">
						${pageData.type === 'information' ? `<h2>Andrew Trousdale</h2>` : `<h2>${pageData.title}</h2>`}
						${pageData.type === 'information' ? `<h3>${pageData.overview}</h3>` : `<h3>${pageData.summary}</h3>`}
						${pageData.role ? `<h4 class="role">${pageData.role}</h4>` : ``}
						${pageData.type === 'information' ? `<h4 class="email"><a href="mailto:${pageData.email}">${pageData.email}</a></h4>` : ''}
						${pageData.type === 'information' && pageData.telephone ? `<h4 class="telephone"><a href="tel:${pageData.telephone}">${pageData.telephone}</a></h4>` : ''}
						${pageData.type !== 'path' && pageData.type !== 'information' ? `<h4>${formatDateRange(pageData.originDate, pageData.endDate)}</h4>` : ''}
					</div>
				</div>
			`;

			function formatDateRange(originDate, endDate) {
				const originYear = originDate ? new Date(originDate).getFullYear() : '';
				const endYear = endDate ? new Date(endDate).getFullYear() : null;
				const writtenEndYear = endDate ? new Date(endDate).getFullYear() : 'Present';

				if (originYear === endYear) {
					return originYear;
				} else {
					return `${originYear} - ${writtenEndYear}`;
				}
			}
			
			pageContent.innerHTML += titlesHTML;
	
			// Add content inner
			// Function to add Read More button before the last punctuation or at the end
			function addReadMoreButton(description) {
				// Create a temporary container to parse the HTML
				const tempContainer = document.createElement('div');
				tempContainer.innerHTML = description;
				// Get the last child element
				const lastElement = tempContainer.lastElementChild;
				if (lastElement) {
					// Get the inner text of the last element
					let lastElementHTML = lastElement.innerHTML;
					// Regex to match the last punctuation character
					const regex = /([.,!?;:])\s*$/;
					// Check if there's a punctuation at the end
					if (regex.test(lastElementHTML)) {
						// If found, insert the button before the punctuation
						lastElementHTML = lastElementHTML.replace(regex, ' <button class="read-more"><span>read more</span></button>$1');
					} else {
						// If not found, append the button at the end
						lastElementHTML = `${lastElementHTML} <button class="read-more"><span>read more</span></button>`;
					}
					// Set the modified inner HTML back to the last element
					lastElement.innerHTML = lastElementHTML;
				}
				// Return the updated HTML
				return tempContainer.innerHTML;
			}

			let contentInnerHTML = `
				<div class="page-content-inner">
					${pageData.description ? `${pageData.extendedDescription ? addReadMoreButton(pageData.description) : pageData.description}` : ''}
					${pageData.extendedDescription ? `<div class="extended-description">${pageData.extendedDescription}</div>` : ''}
					${pageData.footnotes && pageData.footnotes.length > 0 ? `
						<ul class="footnotes">
							${pageData.footnotes.map((footnote, index) => `
								<li class="footnote">
									<span class="footnote-id">${index + 1}.</span>
									<span class="footnote-content">${footnote.footnote}</span>
								</li>
							`).join('')}
						</ul>
					` : ''}
				</div>
			`;
			if(pageData.description || pageData.extendedDescription || (pageData.footnotes && pageData.footnotes.length > 0)){
				pageContent.innerHTML += contentInnerHTML;
			}
	
			// Add tabs
			let tabsHTML = `
				<div class="tabs">
					${pageData.education && pageData.education.length > 0 ? `
						<div class="page-tab tab-links tab-open">
							<div class="tab-titles">
								<span class="tab-icon icon-meta"></span>
								<span class="tab-title">Education</span>
								<span class="tab-indicator"></span>
							</div>
							<div class="tab-content">
								<ul class="list">
									${pageData.education.map(entry => {
										return `
											<li>
												<span class="item-id"></span>
												<span class="item-title">
													<h2>${entry.title}</h2>
													<h3>${entry.subtitle}</h3>
													<h3>${entry.year}</h3>
												</span>
											</li>
										`;
									}).join('')}
								</ul>
							</div>
						</div>
					` : ''}
					${pageData.recognition && pageData.recognition.length > 0 ? `
						<div class="page-tab tab-links">
							<div class="tab-titles">
								<span class="tab-icon icon-recognition"></span>
								<span class="tab-title">Recognition</span>
								<span class="tab-indicator"></span>
							</div>
							<div class="tab-content">
								<ul class="list">
									${pageData.recognition.map(entry => {
										return `
											<li>
												<span class="item-id"></span>
												<span class="item-title">
													<h2>${entry.title}</h2>
													<h3>${entry.subtitle}</h3>
													<h3>${entry.year}</h3>
												</span>
											</li>
										`;
									}).join('')}
								</ul>
							</div>
						</div>
					` : ''}
					${pageData.metadata && pageData.metadata.length > 0 ? `
						<div class="page-tab tab-metadata">
							<div class="tab-titles">
								<span class="tab-icon icon-meta"></span>
								<span class="tab-title">Details</span>
								<span class="tab-indicator"></span>
							</div>
							<div class="tab-content">
								<ul class="list">
									${pageData.metadata.map(meta => `
										<li>
											<span class="meta-subtitle">${meta.subtitle}</span>
											<span class="meta-title">${meta.title}</span>
										</li>
									`).join('')}
								</ul>
							</div>
						</div>
					` : ''}
					${pageData.externalLinks && pageData.externalLinks.length > 0 ? `
						<div class="page-tab tab-links">
							<div class="tab-titles">
								<span class="tab-icon icon-links"></span>
								<span class="tab-title">Further Reading</span>
								<span class="tab-indicator"></span>
							</div>
							<div class="tab-content">
								<ul class="list">
									${pageData.externalLinks.map(link => {
										// Extract the main domain from the link
										const url = new URL(link.link);
										const mainDomain = url.hostname.replace(/^www\./, ''); // Remove 'www.' if present
										return `
											<li>
												<a href="${link.link}" class="external-link" target="_blank">
													<span class="item-id"></span>
													<span class="item-title">
														<span>${link.title}</span>
														<span class="link-address">${mainDomain}</span>
													</span>
												</a>
											</li>
										`;
									}).join('')}
								</ul>
							</div>
						</div>
					` : ''}
					${pageData.children && pageData.children.length > 0 || pageData.connectedNodes && pageData.connectedNodes.length > 0 ? `
						<div class="page-tab tab-connections">
							<div class="tab-titles">
								<span class="tab-icon icon-connections"></span>
								<span class="tab-title">Connections</span>
								<span class="tab-indicator"></span>
							</div>
							<div class="tab-content">
								<ul class="list">
									${[
										...(pageData.children || []),
										...(pageData.connectedNodes ? pageData.connectedNodes.map(uuid => this.findNodeByUUID(Map.data, uuid)).filter(node => node !== null) : [])
									]
									.sort((a, b) => a.title.localeCompare(b.title))
									.map(node => `
										<li>
											<a href="${node.uri}" class="index-link" data-uri="${node.uri}">
												<span class="item-id"><span></span></span>
												<span class="item-title">
													<h2>${node.title}</h2>
													<h3>${node.type}</h3>
												</span>
											</a>
										</li>
									`).join('')}
								</ul>
							</div>
						</div>
					` : ''}
					
				</div>
			`;

			if(pageData.type === 'information'){
				tabsHTML += '<p class="website-credit">Website by <a href="https://jakedowsmith.com" target="_blank">Jake Dow-Smith</a></p>';
			}

			if(pageData.metadata.length > 0 || pageData.externalLinks.length > 0 || pageData.education.length > 0 || pageData.recognition.length > 0 || pageData.children.length > 0 || pageData.connectedNodes.length > 0){
				pageContent.innerHTML += tabsHTML;
			}

			
	
			// Add new .page-content to .page-container
			mainContentInner.appendChild(pageContent);

			Page.buildMedia(pageData);
		} else {
			console.error('Page data not found for URI:', uri);
		}
	},

	// ${pageData.connectedNodes && pageData.connectedNodes.length > 0 ? `
	// 	<div class="page-tab tab-connections">
	// 		<div class="tab-titles">
	// 			<span class="tab-icon icon-connections"></span>
	// 			<span class="tab-title">Connections</span>
	// 			<span class="tab-indicator"></span>
	// 		</div>
	// 		<div class="tab-content">
	// 			<ul class="list">
	// 				${pageData.connectedNodes.map(uuid => {
	// 					const connectedNode = this.findNodeByUUID(Map.data, uuid);
	// 					return connectedNode ? `
	// 						<li>
	// 							<a href="${connectedNode.uri}" class="external-link">
	// 								<span class="item-id"></span>
	// 								<span class="item-title"><a href="${connectedNode.uri}">${connectedNode.title}</a></span>
	// 							</a>
	// 						</li>
	// 					` : '';
	// 				}).join('')}
	// 			</ul>
	// 		</div>
	// 	</div>
	// ` : ''}

	animatePageHeight() {
		const mainContent = document.querySelector('.main-content');
		const mainContentInner = document.querySelector('.main-content-inner');
		const heightFrom = mainContent.offsetHeight;
		let heightTo = mainContentInner.offsetHeight + 1;

		const maxHeight = window.innerWidth > 768 ? window.innerHeight * 0.8 : window.innerHeight * 0.95 - document.querySelector('.header-content').offsetHeight;

		const delay = Page.firstLoad && window.innerWidth > 768 ? 1500 : 10;
		Page.firstLoad = false;

		// Restrict heightTo to be at most 90% of the window height
		if (heightTo > maxHeight) {
			heightTo = maxHeight;
		}
		// mainContent.style.overflow = 'hidden';
		mainContent.style.height = `${heightFrom}px`;

		// Allow the DOM to process the initial height setting
		setTimeout(() => {
			mainContent.style.height = `${heightTo}px`;
			document.querySelector('.page').classList.add('show-gradient');
			setTimeout(() => {
				// mainContent.style.overflow = 'auto';
			}, 800)
		}, delay);
	},

	findPageDataByUri(uri) {
        // Function to recursively find the page data by URI
        const findData = (node, uri) => {
            if (node.uri === uri) return node;
            if (node.children) {
                for (const child of node.children) {
                    const result = findData(child, uri);
                    if (result) return result;
                }
            }
            return null;
        };

        if (!Map.data) return null;
        return findData(Map.data, uri);
    },

	findNodeByUUID(node, uuid) {
		if (node.uuid === uuid) return node;
		if (node.children) {
			for (const child of node.children) {
				const result = this.findNodeByUUID(child, uuid);
				if (result) return result;
			}
		}
		return null;
	}


    
};

export default Page;