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

const imageInput = document.getElementById('imageInput');
const originalImageContainer = document.getElementById('originalImageContainer');
const originalImage = document.getElementById('originalImage');
const saltAndPepperImageContainer = document.getElementById('saltAndPepperImageContainer');
const saltAndPepperImage = document.getElementById('saltAndPepperImage');
const gaussianImageContainer = document.getElementById('gaussianImageContainer');
const gaussianImage = document.getElementById('gaussianImage');
const downloadLink = document.getElementById('downloadLink');
const removeButton = document.getElementById('removeButton');

imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
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

                originalImage.innerHTML = '';
                originalImage.appendChild(img);
                originalImageContainer.style.display = 'block';

                const noisySys = new NoisySystem();
                const saltAndPepperImg = noisySys.createSaltAndPepperNoise(imgArray);
                const gaussianImg = noisySys.createGaussianNoise(imgArray);

                const createNoisyImage = (container, imgData) => {
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

                createNoisyImage(saltAndPepperImageContainer, saltAndPepperImg);
                createNoisyImage(gaussianImageContainer, gaussianImg);

                // Create download links for modified images
                const createDownloadLink = (container, imgData, fileName) => {
                    const link = document.createElement('a');
                    link.href = container.querySelector('canvas').toDataURL();
                    link.download = fileName;
                    link.textContent = 'Download Image';
                    link.classList.add('button');
                    container.appendChild(document.createElement('br')); 
                    container.appendChild(link);
                };

                createDownloadLink(saltAndPepperImageContainer, saltAndPepperImg, 'salt_and_pepper_image.jpg');
                createDownloadLink(gaussianImageContainer, gaussianImg, 'gaussian_image.jpg');

                removeButton.style.display = 'inline-block';
            }
        }
        reader.readAsDataURL(file);
    }
});


removeButton.addEventListener('click', () => {
    originalImage.innerHTML = '';
    originalImageContainer.style.display = 'none';
    saltAndPepperImage.innerHTML = '';
    saltAndPepperImageContainer.style.display = 'none';
    gaussianImage.innerHTML = '';
    gaussianImageContainer.style.display = 'none';
    downloadLink.style.display = 'none';
    removeButton.style.display = 'none';
    imageInput.value = ''; // Clear the file input
});
