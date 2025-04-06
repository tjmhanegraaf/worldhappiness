import * as THREE from './node_modules/three/build/three.module.min.js';

// ------------Text display setup---------------- //

const vars = document.querySelectorAll('#var-list .var1, #var-list .var2, #var-list .var3, #var-list .var4, #var-list .var5, #var-list .var6, #var-list .var7');
const textDisplay = document.getElementById('text-display');

// Color map: class name → hex color string
const varColors = {
  var1: '#006A90',
  var2: '#9FAB20',
  var3: '#EC008D',
  var4: '#943590',
  var5: '#F6821F',
  var6: '#00ADAE'
};

vars.forEach(variable => {
  variable.addEventListener('click', (event) => {
    event.stopPropagation(); // Prevent click event from propagating to the document

    const text = variable.getAttribute('data-text');
    textDisplay.textContent = text;

    // Get the class name to look up color
    const className = [...variable.classList].find(c => varColors[c]);
    if (className) {
      textDisplay.style.color = varColors[className];
    }

    textDisplay.classList.add('show');
  });
});

// Close text display when clicking anywhere else
document.addEventListener('click', () => {
  textDisplay.classList.remove('show');
});

// -----------------Three.JS setup------------------ //

// Globals
let data = [];
const cubes = [];
let totalCubes = 100;
let attributes = ['gdp', 'generosity', 'freedom', 'social_support', 'corruption', 'life_expectancy'];
let color = [0x006A90, 0xCCDB29, 0xEC008D, 0x943590, 0xF6821F, 0x00ADAE];
let angleOffset = 0.2;
let targetAngleOffset = 0;
let scrollSpeed = 0.08;

// Set up the scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xF8F6F9);

// Camera setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 80, -52);
camera.lookAt(0, 0, -52);

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Resize handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

//easing function
function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

// -----------------Cubes creation------------------ //

// Create cubes for the visualization
function createCubes(data, inner_radius = 50, outer_radius = 0.3) {
    for (let j = 0; j < attributes.length; j++) {
        const outerAngle = (j / attributes.length) * Math.PI * 2;
        const x_offset = outer_radius * Math.cos(outerAngle);
        const z_offset = outer_radius * Math.sin(outerAngle);
        const rotation = Math.PI / 2 + outerAngle;

        for (let i = 0; i < totalCubes; i++) {
            const height = parseFloat(data[i][attributes[j]]);
            const geometry = new THREE.BoxGeometry(0.15, height, 0.15);
            const material = new THREE.MeshBasicMaterial({ color: color[j] });
            const cube = new THREE.Mesh(geometry, material);

            const baseAngle = (i / totalCubes) * Math.PI * 2;
            cube.position.set(
                inner_radius * Math.cos(baseAngle) + x_offset,
                height / 2,
                inner_radius * Math.sin(baseAngle) - (inner_radius + 2) + z_offset
            );
            cube.rotation.y = rotation;

            cube.userData = { baseAngle, x_offset, z_offset, inner_radius };
            scene.add(cube);
            cubes.push(cube);
        }
    }
}

const countryGroup = new THREE.Group();

function createCountryGroup(data, radius = 50) {
    // Loop through totalCubes and create empty objects
    for (let i = 0; i < totalCubes; i++) {
        // Create an empty object (no geometry, just position)
        const emptyObject = new THREE.Object3D();
        
        // Set position around a circle based on the index
        emptyObject.position.set(
            Math.cos(i * (Math.PI * 2 / totalCubes)) * radius + 2, 
            0, 
            Math.sin(i * (Math.PI * 2 / totalCubes)) * radius + 2
        );

        // give the object some values
        emptyObject.index = i;
        emptyObject.userData.baseAngle = (i / totalCubes) * Math.PI * 2;
        emptyObject.countryName = data[i]['Country name'];
        // Add the empty object to the group
        countryGroup.add(emptyObject);
    }
    
    // Add the group to the scene
    scene.add(countryGroup);
}

// Create reference cubes for the Netherlands (NL)
function createRefCubes(data, refId = 95) {
    
    for (let j = 0; j < attributes.length; j++) {
        const outerAngle = (j / attributes.length) * Math.PI * 2;
        const x_offset = 0.3 * Math.cos(outerAngle); // radius is hardcoded as the variable took on the value of refId
        const z_offset = 0.3 * Math.sin(outerAngle); // radius is hardcoded as the variable took on the value of refId
        const rotation = Math.PI / 2 + outerAngle;  

        const height = parseFloat(data[refId][attributes[j]]);
        
        const geometry = new THREE.BoxGeometry(0.15, height, 0.15);
        const material = new THREE.MeshBasicMaterial({ color: color[j] });
        const cube = new THREE.Mesh(geometry, material);
        cube.rotation.y = rotation;
        cube.position.set(x_offset, height / 2, z_offset - 2);
        
        scene.add(cube);
    }
}

//----------------Reference Plane---------------------//

// Create a ring geometry 
const ringGeometry = new THREE.RingGeometry(49.4, 50.6, 256); 

// Create semi-transparent material
const ringMaterial = new THREE.MeshBasicMaterial({
  color: 0x471A45,
  transparent: true,
  opacity: 0.1,
  side: THREE.DoubleSide
});

// Create the mesh
const ring = new THREE.Mesh(ringGeometry, ringMaterial);

// Rotate it to lie on the XZ plane
ring.rotation.x = -Math.PI / 2;

// Position it at y = 0 and z = 25
ring.position.set(0, 0, -52);

// Add it to the scene
scene.add(ring);


// // ------------------- country names -------------------//

// Initialize labelContainer
const labelContainer = document.getElementById('label-container');

function getVisibleLabels(offsetAngle) {
    const totalLabels = countryGroup.children.length;
    const anglePerLabel = 2 * Math.PI / totalLabels;

    // Normalize offsetAngle to always stay within 0 and 2 * Math.PI
    const normalizedAngle = (-offsetAngle % (2 * Math.PI));

    // Calculate the current front label index based on normalized angle
    const currentIndex = Math.floor((normalizedAngle / anglePerLabel));

    const visibleLabels = [];
    const frontIndex = 37; // Front label index (adjust if needed)

    // Show 10 labels around the circle, including wrapping around to the other side
    for (let i = -10; i < 10; i++) {
        // Adjust the index to wrap around correctly with the frontIndex at 0 and 2 * Math.PI
        const index = (frontIndex + i + currentIndex + totalLabels) % totalLabels;
        visibleLabels.push(index);
    }

    return visibleLabels;
}

// Update labels for visible countries
function updateLabels(offsetAngle) {
    // Clear existing labels
    labelContainer.innerHTML = '';

    // Get the visible labels
    const visibleLabels = getVisibleLabels(offsetAngle);
    visibleLabels.forEach(i => {
        const countryObj = countryGroup.children[i];
        
        // Ensure countryObj exists
        if (!countryObj) return;

        // Position of the country object in 3D space
        const position = countryObj.getWorldPosition(new THREE.Vector3());
        
        // Convert the 3D position to screen coordinates
        const vector = position.project(camera);
        
        // Normalize the position to screen coordinates
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;

        // Create a label for the country
        const label = document.createElement('div');
        label.className = 'country-label';
        label.textContent = countryObj.countryName;
        label.style.position = 'absolute';
        label.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
        label.style.padding = '5px';
        label.style.borderRadius = '2px';
        label.style.left = `${x - 20}px`;
        label.style.top = `${y + 30}px`;  // Adjust the y position to avoid overlapping
        label.style.color = '#471A45';
        label.style.fontFamily = 'Segoe UI, sans-serif';
        label.style.fontSize = '15px';
        label.style.pointerEvents = 'none';
        label.style.textAlign = 'center';

        // Append the label to the label container
        labelContainer.appendChild(label);
    });
}

// Function to create a static label at the center
function createStaticLabel() {
    const staticLabel = document.createElement('div');
    staticLabel.className = 'static-label';
    staticLabel.textContent = 'Netherlands';
    
    // Apply the same styles as the country labels
    staticLabel.style.position = 'absolute';
    staticLabel.style.background = 'rgba(255, 255, 255, 0.5)';
    staticLabel.style.padding = '5px';
    staticLabel.style.borderRadius = '5px';
    staticLabel.style.left = '50%';  // Horizontally center it
    staticLabel.style.top = '71%';   // Vertically center it
    staticLabel.style.transform = 'translate(-50%, -50%)';  // Adjust the position to truly center it
    staticLabel.style.color = '#471A45';
    staticLabel.style.fontFamily = 'Segoe UI, sans-serif';
    staticLabel.style.fontSize = '15px';
    staticLabel.style.textAlign = 'center';
    staticLabel.style.pointerEvents = 'none';  // Prevent interaction with the label
    staticLabel.style.zIndex = 1000;  // Ensure it's above other content

    // Append the label to the body
    document.body.appendChild(staticLabel);
}


// ------------------Data loading------------------ //

// Load CSV data
function loadData(data_path = '/data/output/happiness.csv', initCubes = true, initRefCubes = true, refId = 95) {
    fetch(data_path)
        .then(response => response.text())
        .then(csvData => {
            Papa.parse(csvData, {
                complete: function (results) {
                    data = results.data; 
                    totalCubes = data.length - 1;
                    targetAngleOffset = 0.01; // Offset the rotation by half to have Ref at the center
                    if (initCubes) createCubes(data);
                    if (initRefCubes) createRefCubes(data, refId);
                    createCountryGroup(data); // Create empty object group

                    animate(); // animate only after cubes are initialized
                    
                },
                header: true
            });
        })
        .catch(error => console.error('Error fetching CSV file:', error));
}

// ----------------Animation------------------ //

// camera animation variables
let cameraAnimation = 0;
let cameraAnimationTarget = 0;
const camStartPos = new THREE.Vector3(0, 80, -52);
const camEndPos = new THREE.Vector3(0, 2.3, 5);
// camera look at variables
const camStartLookAt = new THREE.Vector3(0, 0, -52);
const camEndLookAt = new THREE.Vector3(0, 0, -52);
const cameraLookVec = new THREE.Vector3();

// NL layer
let labelCreated = false;


// Scroll rotation handler
window.addEventListener('wheel', event => {

    // rotation for circle
    targetAngleOffset += (event.deltaY / 100) * (Math.PI * 2) / totalCubes;
    //camera rotation goes from 0 to 1
    if (cameraAnimationTarget < 1) {
        if(event.deltaY > 0){
            cameraAnimationTarget += event.deltaY / 1000;
            if (cameraAnimationTarget > 1) cameraAnimationTarget = 1;
        }
    }
});


// Animate the scene
function animate() {
    requestAnimationFrame(animate);

    // Smoothly interpolate to the target value
    cameraAnimation += (cameraAnimationTarget - cameraAnimation) * 0.05; 

    // set camera 
    camera.position.lerpVectors(camStartPos, camEndPos, cameraAnimation);
    cameraLookVec.lerpVectors(camStartLookAt, camEndLookAt, cameraAnimation);
    camera.lookAt(cameraLookVec);
 
    // Lerp ring towards new position
    angleOffset += (targetAngleOffset - angleOffset) * scrollSpeed;

    cubes.forEach(cube => {
        const { baseAngle, x_offset, z_offset, inner_radius } = cube.userData;
        const angle = baseAngle + angleOffset;
        cube.position.x = inner_radius * Math.cos(angle) + x_offset;
        cube.position.z = inner_radius * Math.sin(angle) - (inner_radius + 2) + z_offset;
    });

    if(cameraAnimation > 0.8){
        countryGroup.children.forEach(emptyObject => {
            // Access the baseAngle from userData
            const { baseAngle } = emptyObject.userData;
            const angle = baseAngle + angleOffset;
            emptyObject.position.x = 50 * Math.cos(angle) ;
            emptyObject.position.z = 50 * Math.sin(angle) - 52;

            
            
        });
        updateLabels(angleOffset = angleOffset);
        // initiate label on camera movement
        if(cameraAnimation > .99) {
            if(labelCreated == false)   {
                createStaticLabel();
            }
        }
    }
    
    renderer.render(scene, camera);
}

// Start the data load and animation
loadData();

