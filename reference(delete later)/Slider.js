// File: components/Slider.js
import Data from '../utils/Data.js';
import Router from '../utils/Router.js';
import Map from './Map.js';
import Page from './Page.js';

const Slider = {
    initialize(map, sliderValue) {
        this.map = map; // Reference to the Map object
		if(document.querySelector('.slider-container')) {
			document.querySelector('.slider-container').remove();
		}
        this.createSlider(sliderValue);
		this.addScrollListener();
    },

    createSlider(sliderValue = null) {
        const sliderContainer = document.createElement('div');
        sliderContainer.className = 'slider-container';
        document.body.appendChild(sliderContainer);
    
        const stepCount = parseInt(document.querySelector('.slider-container').clientWidth * 0.11);
    
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = 0;
        slider.max = stepCount; // Fixed to 1000 steps
        slider.step = 1;
        slider.value = slider.max; // Start at the highest level
        slider.className = 'date-slider';
        sliderContainer.appendChild(slider);
    
        let lastSelectedDate = null;
        const stepToDateIndex = this.generateStepToDateIndexMap(stepCount); // Pass the number of steps
    
        const debouncedUpdateSliderState = Map.debounce((stepIndex) => {
            Router.updateSliderState(stepIndex);
        }, 500);
    
        slider.addEventListener('input', (event) => {
            const stepIndex = event.target.value;
            const dateIndex = stepToDateIndex[stepIndex];
            const selectedDate = this.map.uniqueDates[dateIndex];
    
            // Only update the map if the selected date has changed, and it's not the first update
            if (selectedDate !== lastSelectedDate) {
                if (lastSelectedDate !== null) {
                    this.map.updateMap(selectedDate);
                }
                lastSelectedDate = selectedDate;
            }
    
            debouncedUpdateSliderState(stepIndex);
        });
    
        this.addSliderMarks(slider, stepCount); // Pass the number of steps
        this.createPlayPauseButton(slider, stepToDateIndex);
    
        if (sliderValue !== null) {
            document.querySelector('.date-slider').value = parseInt(sliderValue, 10);
        }
    
        // Trigger the input event to update the map with the highest level initially
        const sliderEvent = new Event('input', { bubbles: true });
        document.querySelector('.date-slider').dispatchEvent(sliderEvent);
    },

    generateStepToDateIndexMap(steps) {
        const earliestDate = new Date(this.map.uniqueDates[0]);
        const latestDate = new Date(this.map.uniqueDates[this.map.uniqueDates.length - 1]);
        const totalDuration = latestDate - earliestDate;

        const stepToDateIndex = Array(steps + 1).fill(0); // steps + 1 for 0 to steps

        this.map.uniqueDates.forEach((date, index) => {
            const datePosition = (new Date(date) - earliestDate) / totalDuration;
            const stepPosition = Math.round(datePosition * steps);
            stepToDateIndex[stepPosition] = index;
        });

        // Fill in any gaps in the map to ensure smooth transitions between dates
        for (let i = 1; i < stepToDateIndex.length; i++) {
            if (stepToDateIndex[i] === 0 && i !== 0) {
                stepToDateIndex[i] = stepToDateIndex[i - 1];
            }
        }

        return stepToDateIndex;
    },

    addSliderMarks(slider, steps) {
        const sliderMarksBackground = document.createElement('div');
        sliderMarksBackground.className = 'slider-marks-background-container';
        slider.parentNode.insertBefore(sliderMarksBackground, slider);

        const stepToDateIndex = this.generateStepToDateIndexMap(steps);
        const earliestDate = new Date(this.map.uniqueDates[0]);
        const latestDate = new Date(this.map.uniqueDates[this.map.uniqueDates.length - 1]);
        const totalDuration = latestDate - earliestDate;

        // Create background marks
        for (let i = 0; i <= steps; i++) {
            const mark = document.createElement('span');
            mark.className = 'slider-mark-background';
            mark.style.left = `${(i / steps) * 100}%`;

            // Add hidden span with date value
            const hiddenSpan = document.createElement('span');
            hiddenSpan.className = 'mark-date';
            // If it's the same as the previous one, lets fill it as there was nothing on this date
            if (stepToDateIndex[i] !== stepToDateIndex[i - 1]) {
                const date = this.map.uniqueDates[stepToDateIndex[i]];
                const dateWithDots = date.split('-').join('·');
                hiddenSpan.textContent = dateWithDots;
            } else {
                // Calculate the interpolated date for positions without an actual origin date
                const interpolatedDate = new Date(earliestDate.getTime() + (totalDuration * (i / steps)));
                const dateWithDots = (interpolatedDate.toISOString().split('T')[0]).split('-').join('·');
                hiddenSpan.textContent = dateWithDots; // Format date as YYYY-MM-DD
            }
            mark.appendChild(hiddenSpan);

            sliderMarksBackground.appendChild(mark);
        }

        // Create active slider marks
        const sliderMarksContainer = document.createElement('div');
        sliderMarksContainer.className = 'slider-marks-container';
        slider.parentNode.insertBefore(sliderMarksContainer, slider.nextSibling);

        this.map.uniqueDates.forEach((date) => {
            const datePosition = (new Date(date) - earliestDate) / totalDuration;
            const stepPosition = Math.round(datePosition * steps); // Align date with steps
            const mark = document.createElement('span');
            mark.className = 'slider-mark';
            mark.style.left = `${(stepPosition / steps) * 100}%`;
            mark.dataset.date = date; // Add data attribute for easy comparison
            sliderMarksContainer.appendChild(mark);
        });

        // Update classes based on slider position
        slider.addEventListener('input', (event) => {
            const stepIndex = event.target.value;
            const dateIndex = stepToDateIndex[stepIndex];
            const selectedDate = this.map.uniqueDates[dateIndex];

            // Update active background mark
            document.querySelectorAll('.slider-mark-background').forEach((mark, index) => {
                if (index === Number(stepIndex)) {
                    mark.classList.add('background-mark-active');
                } else {
                    mark.classList.remove('background-mark-active');
                }
            });

            // Update active slider marks
            document.querySelectorAll('.slider-mark').forEach(mark => {
                if (mark.dataset.date === selectedDate) {
                    mark.classList.add('mark-active');
                } else {
                    mark.classList.remove('mark-active');
                }
            });
        });

        // Initialize the first active slider mark
        const initialStepIndex = slider.value;
        const initialDateIndex = stepToDateIndex[initialStepIndex];
        const initialSelectedDate = this.map.uniqueDates[initialDateIndex];

        document.querySelectorAll('.slider-mark').forEach(mark => {
            if (mark.dataset.date === initialSelectedDate) {
                mark.classList.add('mark-active');
            } else {
                mark.classList.remove('mark-active');
            }
        });

        // Initialize the first active background mark
        document.querySelectorAll('.slider-mark-background').forEach((mark, index) => {
            if (index === Number(initialStepIndex)) {
                mark.classList.add('background-mark-active');
            } else {
                mark.classList.remove('background-mark-active');
            }
        });
    },

	easeOutQuart(t) {
		return 1 - Math.pow(1 - t, 4);
	},

    createPlayPauseButton(slider, stepToDateIndex) {
        const button = document.createElement('button');
        button.className = 'map-play-button';
        button.textContent = 'Play';
        document.querySelector('.slider-container').appendChild(button);

        let isPlaying = false;
        let playInterval = null;

        button.addEventListener('click', () => {
            if (isPlaying) {
                clearInterval(playInterval);
                button.textContent = 'Play';
                document.body.classList.remove('map-playing');
            } else {
                button.textContent = 'Pause';
                document.body.classList.add('map-playing');
                const incrementSlider = () => {
                    if (parseInt(slider.value) < parseInt(slider.max)) {
                        slider.value = parseInt(slider.value) + 1;
                        // Dispatch an input event to trigger the slider's input event listener
                        const event = new Event('input', {
                            bubbles: true,
                            cancelable: true,
                        });
                        slider.dispatchEvent(event);
                    } else {
                        clearInterval(playInterval);
                        button.textContent = 'Play';
                        document.body.classList.remove('map-playing');
                    }
                };

                if (parseInt(slider.value) === parseInt(slider.max)) {
                    slider.value = 0;
                    const event = new Event('input', {
                        bubbles: true,
                        cancelable: true,
                    });
                    slider.dispatchEvent(event);
                }
                incrementSlider();
                playInterval = setInterval(incrementSlider, 250);
            }
            isPlaying = !isPlaying;
        });
    },


	addScrollListener() {
		const mapContainer = document.querySelector('.map-container');
		const slider = document.querySelector('.date-slider');
	
		if (mapContainer && slider) {
			let accumulatedScroll = 0;
			const scrollSensitivity = 0.0075; // Adjust this value to make scrolling slower (smaller = slower)
	
			mapContainer.addEventListener('wheel', (event) => {
				
				if(Page.pageOpen) return;

				event.preventDefault();
	
				accumulatedScroll += event.deltaY * scrollSensitivity;
	
				// Only process the scroll when accumulatedScroll reaches a significant threshold
				if (Math.abs(accumulatedScroll) >= 1) {
					let stepIndex = parseInt(slider.value, 10);
	
					if (accumulatedScroll > 0) {
						// Scroll down
						stepIndex = Math.min(slider.max, stepIndex + Math.floor(accumulatedScroll));
					} else {
						// Scroll up
						stepIndex = Math.max(0, stepIndex + Math.ceil(accumulatedScroll));
					}
	
					slider.value = stepIndex;
					const sliderEvent = new Event('input', { bubbles: true });
					slider.dispatchEvent(sliderEvent);
	
					// Reduce the accumulatedScroll by the processed amount
					accumulatedScroll -= accumulatedScroll > 0 ? Math.floor(accumulatedScroll) : Math.ceil(accumulatedScroll);
				}
			});
		}
	}

};

export default Slider;