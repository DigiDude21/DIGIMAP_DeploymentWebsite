class NoisySystem {
    constructor() {}

    createSaltAndPepperNoise(img, amount = 0.05) {
        // Getting the dimensions of the image
        const h = img.length;
        const w = img[0].length;

        // Setting the ratio of salt and pepper in salt and pepper noised image
        const s = 0.5;
        const p = 0.5;

        // Initializing the result (noisy) image
        let result = img.map(row => row.slice());

        // Adding salt noise to the image
        const salt = Math.ceil(amount * img.length * img[0].length * s);
        for (let i = 0; i < salt; i++) {
            const x = Math.floor(Math.random() * h);
            const y = Math.floor(Math.random() * w);
            result[x][y] = 255; // White pixel (salt)
        }

        // Adding pepper noise to the image
        const pepper = Math.ceil(amount * img.length * img[0].length * p);
        for (let i = 0; i < pepper; i++) {
            const x = Math.floor(Math.random() * h);
            const y = Math.floor(Math.random() * w);
            result[x][y] = 0; // Black pixel (pepper)
        }

        return result;
    }

    createGaussianNoise(img, mean = 0, variance = 0.01) {
        // Normalize the input image data
        const normalizedImg = img.map(row => row.map(val => val / 255));
    
        // Initializing the result (noisy) image
        let result = normalizedImg.map(row => row.slice());
    
        // Adding Gaussian noise to the image
        for (let i = 0; i < normalizedImg.length; i++) {
            for (let j = 0; j < normalizedImg[0].length; j++) {
                const noise = gaussianRandom(mean, Math.sqrt(variance));
                result[i][j] += noise;
                // Clamp the values between 0 and 1
                result[i][j] = Math.min(Math.max(result[i][j], 0), 1);
            }
        }
    
        // Convert the result back to uint8 data type
        result = result.map(row => row.map(val => Math.round(val * 255)));
    
        return result;
    }    
}

function gaussianRandom(mean, stdDev) {
    let u = 0, v = 0;
    while (u === 0) u = Math.random(); // Converting [0,1) to (0,1)
    while (v === 0) v = Math.random();
    let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return num * stdDev + mean;
}

class DenoisementSystem {
    constructor() {}

    // Method to find all neighbors for each pixel
    static findAllNeighbors(img, smallWindow, bigWindow) {
        const h = img.length;
        const w = img[0].length;
        const smallWidth = Math.floor(smallWindow / 2);
        // const bigWidth = Math.floor(bigWindow / 2); // From the original, but unnecessary because the loop changes remain fundamentally the same
    
        const neighbors = [];
    
        for (let i = 0; i < h; i++) {
            const row = [];
            for (let j = 0; j < w; j++) {
                const pixelWindow = [];
                for (let m = -smallWidth; m <= smallWidth; m++) {
                    const newRow = [];
                    for (let n = -smallWidth; n <= smallWidth; n++) {
                        const x = Math.max(0, Math.min(h - 1, i + m));
                        const y = Math.max(0, Math.min(w - 1, j + n));
                        newRow.push(img[x][y]);
                    }
                    pixelWindow.push(newRow);
                }
                row.push(pixelWindow);
            }
            neighbors.push(row);
        }
    
        return neighbors;
    }
    

    static evaluateNorm(pixelWindow, neighborWindow, Nw) {
        let Ip_Numerator = 0;
        let Z = 0;
    
        // Iterate over the neighborhood window
        for (let i = 0; i < neighborWindow.length; i++) {
            for (let j = 0; j < neighborWindow[0].length; j++) {
                const q_window = neighborWindow[i][j];
                const q_x = Math.floor(q_window.length / 2);
                const q_y = Math.floor(q_window[0].length / 2);
                const Iq = q_window[q_x][q_y];
    
                // Calculate the weight
                const w = Math.exp(-((this.sumSquaredDifference(pixelWindow, q_window)) / Nw));
    
                // Accumulate Ip_Numerator and Z
                Ip_Numerator += w * Iq;
                Z += w;
            }
        }
    
        // Calculate Ip
        const Ip = Ip_Numerator / Z;
        return Math.round(Ip); // Round the result to match Python's behavior
    }
    
    // Helper function to calculate the sum of squared differences between two pixel windows
    static sumSquaredDifference(window1, window2) {
        let sum = 0;
        for (let i = 0; i < window1.length; i++) {
            for (let j = 0; j < window1[0].length; j++) {
                sum += (window1[i][j] - window2[i][j]) ** 2;
            }
        }
        return sum;
    }

    static nlMeansDenoise(img, h = 20, smallWindow = 7, bigWindow = 21) {
        // Padding the original image with reflect mode
        const padImg = this.padImage(img, bigWindow);
        if (!h) h = 20;
        // Perform NLM denoising
        const result = this.NLM(padImg, img, h, smallWindow, bigWindow);

        return result;
    }

    static padImage(img, bigWindow) {
        const h = img.length;
        const w = img[0].length;
        const padSize = Math.floor(bigWindow / 2);

        const paddedImg = [];
        for (let i = 0; i < h + 2 * padSize; i++) {
            const row = [];
            for (let j = 0; j < w + 2 * padSize; j++) {
                const x = Math.max(0, Math.min(h - 1, i - padSize));
                const y = Math.max(0, Math.min(w - 1, j - padSize));
                row.push(img[x][y]);
            }
            paddedImg.push(row);
        }

        return paddedImg;
    }

    static NLM(padImg, img, h, smallWindow, bigWindow) {
        // Calculating neighborhood window
        const Nw = h ** 2 * smallWindow ** 2;

        // Getting dimensions of the image
        const hDim = img.length;
        const wDim = img[0].length;

        // Initializing the result
        const result = [];

        // Finding width of the neighbor window and padded image from the center pixel
        const bigWidth = Math.floor(bigWindow / 2);

        // Preprocessing the neighbors of each pixel
        const neighbors = this.findAllNeighbors(padImg, smallWindow, bigWindow);

        // NL Means algorithm
        for (let i = bigWidth; i < bigWidth + hDim; i++) {
            const row = [];
            for (let j = bigWidth; j < bigWidth + wDim; j++) {
                // (small_window x small_window) array for pixel p
                const pixelWindow = neighbors[i][j];

                // (big_window x big_window) pixel neighborhood array for pixel p
                const neighborWindow = neighbors.slice(i - bigWidth, i + bigWidth + 1).map(row => row.slice(j - bigWidth, j + bigWidth + 1));

                // Calculating Ip using pixelWindow and neighborWindow
                const Ip = this.evaluateNorm(pixelWindow, neighborWindow, Nw);

                // Clipping the pixel values to stay between 0-255
                row.push(Math.max(0, Math.min(255, Math.round(Ip))));
            }
            result.push(row);
        }

        return result;
    }
    
}


const imageInput = document.getElementById('imageInput');
const originalImageContainer = document.getElementById('originalImageContainer');
const saltAndPepperImageContainer = document.getElementById('saltAndPepperImageContainer');
const gaussianImageContainer = document.getElementById('gaussianImageContainer');
const nlmSPDenoisedContainer = document.getElementById('nlmSPDenoisedContainer');
const nlmGaussianDenoisedContainer = document.getElementById('nlmGaussianDenoisedContainer');
const removeButton = document.getElementById('removeButton');
const filterDegree = document.getElementById('filterDegree');

imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            clearContainers();
            const img = new Image();
            img.src = e.target.result;
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                context.drawImage(img, 0, 0);
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                const pixelData = imageData.data;

                const imgArray = [];
                for (let i = 0; i < pixelData.length; i += 4) {
                    const avg = (pixelData[i] + pixelData[i + 1] + pixelData[i + 2]) / 3;
                    if (!imgArray[Math.floor(i / 4 / canvas.width)]) {
                        imgArray[Math.floor(i / 4 / canvas.width)] = [];
                    }
                    imgArray[Math.floor(i / 4 / canvas.width)][i / 4 % canvas.width] = avg;
                }

                const noisySys = new NoisySystem();
                const saltAndPepperImg = noisySys.createSaltAndPepperNoise(imgArray);
                const gaussianImg = noisySys.createGaussianNoise(imgArray);

                const createImage = (container, imgData) => {
                    const noisyImgElement = document.createElement('canvas');
                    const noisyContext = noisyImgElement.getContext('2d');
                    noisyImgElement.width = canvas.width;
                    noisyImgElement.height = canvas.height;
                    for (let y = 0; y < canvas.height; y++) {
                        for (let x = 0; x < canvas.width; x++) {
                            const color = imgData[y][x];
                            noisyContext.fillStyle = `rgb(${color},${color},${color})`;
                            noisyContext.fillRect(x, y, 1, 1);
                        }
                    }
                    imgData.innerHTML = '';
                    container.appendChild(noisyImgElement);
                    container.style.display = 'block';
                };

                // Create download links for noisy images
                const createDownloadLink = (container, imgData, fileName) => {
                    const link = document.createElement('a');
                    link.href = container.querySelector('canvas').toDataURL();
                    link.download = fileName;
                    link.textContent = 'Download Image';
                    link.classList.add('button');
                    container.appendChild(document.createElement('br')); 
                    container.appendChild(link);
                };

                // Display original image
                createImage(originalImageContainer, imgArray);

                // Noisy images
                createImage(saltAndPepperImageContainer, saltAndPepperImg);
                createDownloadLink(saltAndPepperImageContainer, saltAndPepperImg, 'salt_and_pepper_image.jpg');

                createImage(gaussianImageContainer, gaussianImg);
                createDownloadLink(gaussianImageContainer, gaussianImg, 'gaussian_image.jpg');

                // Perform denoising using Non-Local Means algorithm
                const denoisedSaltAndPepper = DenoisementSystem.nlMeansDenoise(saltAndPepperImg, filterDegree.value);
                const denoisedGaussian = DenoisementSystem.nlMeansDenoise(gaussianImg, filterDegree.value);

                // Display denoised images and create download links for them
                createImage(nlmSPDenoisedContainer, denoisedSaltAndPepper);
                createDownloadLink(nlmSPDenoisedContainer, denoisedSaltAndPepper, 'nlm_salt_and_pepper_denoised_image.jpg');

                createImage(nlmGaussianDenoisedContainer, denoisedGaussian);
                createDownloadLink(nlmGaussianDenoisedContainer, denoisedGaussian, 'nlm_gaussian_denoised_image.jpg');

                removeButton.style.display = 'inline-block';
            }
        }
        reader.readAsDataURL(file);
    }
});


removeButton.addEventListener('click', () => {
    clearContainers();
});

function clearContainers() {
    const containers = [originalImageContainer, saltAndPepperImageContainer, gaussianImageContainer, nlmSPDenoisedContainer, nlmGaussianDenoisedContainer];

    containers.forEach(container => {
        // Hide the container
        container.style.display = 'none';

        // Remove all child elements except h2 from each container
        const children = container.childNodes;
        for (let i = children.length - 1; i >= 0; i--) {
            const child = children[i];
            if (child.tagName !== 'H2') {
                container.removeChild(child);
            }
        }
    });

    // Hide the remove button
    removeButton.style.display = 'none';

    // Clear the file input
    imageInput.value = '';
}



