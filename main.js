import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { InteractionManager } from 'three.interactive';

// Set up variables
// Toggle this to true to disable all 'player' references for testing
const testingMode = false; // Set to true to disable SL integration
if (!testingMode) {
    var player = parent.GetPlayer(); // Assuming this is defined in the Storyline environment
}
var meshLoaded = false;
var autoAnimate = true;
var scrollEnabled = true;
const clock = new THREE.Clock();

var animNum = 0;
var animNumTarget = 0;
var lerpAmount = 0.04;

const stringSounds = [
    './sounds/string-1.mp3', // string1 (E) - add your sound file path here
    './sounds/string-2.mp3', // string2 (A) - add your sound file path here
    './sounds/string-3.mp3', // string3 (D) - add your sound file path here
    './sounds/string-4.mp3', // string4 (G) - add your sound file path here
    './sounds/string-5.mp3', // string5 (B) - add your sound file path here
    './sounds/string-6.mp3'  // string6 (E) - add your sound file path here
];

// Function to play string sound
function playStringSound(stringIndex) {
    if (stringSounds[stringIndex]) {
        const audio = new Audio(stringSounds[stringIndex]);
        audio.play().catch(e => console.log('Audio play failed:', e));
    } else {
        console.log(`String ${stringIndex + 1} clicked - no sound file assigned`);
    }
}


// Set up Renderer
const renderer = new THREE.WebGLRenderer({antialias:true, alpha: true});
renderer.outputColorspace = THREE.SRGBColorSpace;
renderer.setSize(window.innerWidth, window.innerHeight);
//renderer.setClearColor(0xfaf7f3);
renderer.setPixelRatio(window.devicePixelRatio * 2);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1;
document.body.appendChild(renderer.domElement);

// Set up Scene
const scene = new THREE.Scene();
const environmentTexture = new THREE.CubeTextureLoader().setPath('./env/').load(['px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png']);
scene.environment = environmentTexture;
scene.environmentIntensity = 2.25;
scene.fog = new THREE.Fog(0xF3F1ED, 1, 25);



// Placeholder camera, will be replaced if GLB contains a camera
let camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 20);

const interactionManager = new InteractionManager(renderer, camera, renderer.domElement);

// --- Debug Camera Toggle ---
let debugMode = false;
let orbitControls = null;
let animatedCamera = camera;

function enableOrbitControls() {
    if (!orbitControls) {
        orbitControls = new OrbitControls(camera, renderer.domElement);
        orbitControls.enableDamping = true;
        orbitControls.dampingFactor = 0.05;
        orbitControls.target.set(0, 0, 0);
        orbitControls.update();
    }
    orbitControls.enabled = true;
}

function disableOrbitControls() {
    if (orbitControls) {
        orbitControls.enabled = false;
    }
}

window.addEventListener('keydown', (e) => {
    if (e.key === 'f' || e.key === 'F') {
        debugMode = !debugMode;
        if (debugMode) {
            enableOrbitControls();
        } else {
            disableOrbitControls();
        }
    }
});

// --- Ground Plane (Shadow Catcher) ---
// Create a large ground plane that only receives shadows
const groundGeometry = new THREE.PlaneGeometry(100, 100);
// Use a shadow material so it only shows shadows
const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.25 });
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0; // Adjust as needed for your scene
ground.receiveShadow = true;
scene.add(ground);


let mixers = [];
const loader = new GLTFLoader().setPath('./models/');
loader.load('street_01.glb', (gltf) => {
    // Find and use the imported camera if present
    let importedCamera = null;
    gltf.scene.traverse(function(child) {
        if (child.isMesh) {
            child.castShadow = false;
            child.receiveShadow = true;
        }
        if (child.isCamera && !importedCamera) {
            importedCamera = child;
        }
    });

    // If the GLB has a camera, use it
    if (gltf.cameras && gltf.cameras.length > 0) {
        camera = gltf.cameras[0];
    } else if (importedCamera) {
        camera = importedCamera;
    }
    interactionManager.camera = camera;
    // Traverse all objects and set up animation mixers for each targeted by animation tracks
    if (gltf.animations && gltf.animations.length > 0) {
        gltf.animations.forEach((clip) => {
            gltf.scene.traverse((object) => {
                if (clip.tracks.some(track => track.name.startsWith(object.name))) {
                    const mixer = new THREE.AnimationMixer(object);
                    mixer.clipAction(clip).play();
                    mixers.push(mixer);
                }
            });
        });
    }

    const mesh = gltf.scene;
    const amyMain = mesh.getObjectByName("amyMain");
    amyMain.castShadow = true;
    const guitarMain = mesh.getObjectByName("guitarMain");
    guitarMain.castShadow = true;
    const ballMain = mesh.getObjectByName("ballMain");
    ballMain.castShadow = true;
    const advert1 = mesh.getObjectByName("advert1");
    advert1.castShadow = true;
    const advert2 = mesh.getObjectByName("advert2");
    advert2.castShadow = true;

        // Ensure all meshes under guitarMain, advert1, and advert2 cast shadows
        [guitarMain, advert1, advert2].forEach(obj => {
            if (obj) {
                obj.traverse(child => {
                    if (child.isMesh) {
                        child.castShadow = true;
                    }
                });
            }
        });

    // Add guitar logic
    const string1 = mesh.getObjectByName("string-_E");
    string1.castShadow = false;
    string1.receiveShadow = false;
    string1.visible = false;
        string1.addEventListener('click', (event) => {
            event.stopPropagation();
            playStringSound(0);
        });
    
    const string2 = mesh.getObjectByName("string-A");
    string2.castShadow = false;
    string2.receiveShadow = false;
    string2.visible = false;
        string2.addEventListener('click', (event) => {
            event.stopPropagation();
            playStringSound(1);
        });
    
    const string3 = mesh.getObjectByName("string-D");
    string3.castShadow = false;
    string3.receiveShadow = false;
    string3.visible = false;
        string3.addEventListener('click', (event) => {
            event.stopPropagation();
            playStringSound(2);
        });
    
    const string4 = mesh.getObjectByName("string-G");
    string4.castShadow = false;
    string4.receiveShadow = false;
    string4.visible = false;
        string4.addEventListener('click', (event) => {
            event.stopPropagation();
            playStringSound(3);
        });
    
    const string5 = mesh.getObjectByName("string-B");
    string5.castShadow = false;
    string5.receiveShadow = false;
    string5.visible = false;
        string5.addEventListener('click', (event) => {
            event.stopPropagation();
            playStringSound(4);
        });
    
    const string6 = mesh.getObjectByName("string-E");
    string6.castShadow = false;
    string6.receiveShadow = false;
    string6.visible = false;
        string6.addEventListener('click', (event) => {
            event.stopPropagation();
            playStringSound(5);
        });
    interactionManager.add(string1);
    interactionManager.add(string2);
    interactionManager.add(string3);
    interactionManager.add(string4);
    interactionManager.add(string5);
    interactionManager.add(string6);

    scene.add(mesh);
    window.advertSpot1 = attachAdvertSpotlight('advertLight1', '9dcd5d');
    window.advertSpot2 = attachAdvertSpotlight('advertLight2', 'e6a8ac');

    meshLoaded = true;
    if(!testingMode){
        player.setVar("meshLoaded", true);
    }
});



// Add lights
const light1 = new THREE.DirectionalLight(0xFFF9EE, 2);
light1.position.set(-2, 6, 4);
light1.castShadow = true;
light1.shadow.mapSize.width = 1024;
light1.shadow.mapSize.height = 1024;
light1.shadow.bias = -0.01;

light1.shadow.camera.left = -5;
light1.shadow.camera.right = 5;
light1.shadow.camera.top = 5;
light1.shadow.camera.bottom = -15;
light1.shadow.camera.near = 1;
light1.shadow.camera.far = 13;

scene.add(light1);

const light2 = new THREE.DirectionalLight(0xEEF9FF, 0.5);
light2.position.set(3, 2, -5);
light2.castShadow = false;

scene.add(light2);

const light3 = new THREE.DirectionalLight(0xFFFFFF, 3.25);
light3.position.set(-4, 2, -3.5);
light3.castShadow = false;

scene.add(light3);

// Add a helper to visualize the shadow camera frustum
//const shadowCameraHelper = new THREE.CameraHelper(light3.shadow.camera);
//scene.add(shadowCameraHelper);

// Attach spotlights to advertLight1 and advertLight2

function attachAdvertSpotlight(emptyName, colorHex) {
    const emptyObj = scene.getObjectByName(emptyName);
    if (!emptyObj) {
        //console.warn(`Empty object '${emptyName}' not found.`);
        return;
    }
    const spot = new THREE.SpotLight('#' + colorHex, 12, 5, Math.PI * 0.45, 0.5, 1);
    spot.position.copy(emptyObj.position);
    spot.castShadow = false;
    // Set target in front of empty (local -Z direction)
    const target = new THREE.Object3D();
    target.position.set(0, 0, -1); // local -Z
    emptyObj.add(target);
    target.updateMatrixWorld();
    spot.target = target;
    scene.add(spot);
    scene.add(spot.target);
    //console.log(`Spotlight attached to '${emptyName}' at position`, spot.position, 'target:', spot.target.position);
    spot.userData._emptyName = emptyName;
    return spot;
}

//scene.add(shadowCameraHelper);

// Controls for the camera orbit
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.autoRotate = false;
controls.maxDistance = 200;
controls.minDistance = 3;
controls.maxPolarAngle = 2.1;
controls.target = new THREE.Vector3(0, 0, 0);
controls.update();

function lerpNum() {
    if (Math.abs(animNum - animNumTarget) > 0.00025) {
        animNum += (animNumTarget - animNum) * lerpAmount;
    } else {
        animNum = animNumTarget;
    }
    if(meshLoaded){
        if(!autoAnimate){
            mixers.forEach(mixer => mixer.setTime(animNum));
        }
    }

    moveLight3();
}

document.addEventListener("wheel", (event) => {
    if(scrollEnabled){
        animNumTarget += event.deltaY / 1300;
        animNumTarget = Math.max(0, Math.min(animNumTarget, 38.3));
    }
});

//Render loop
function render(){
    // Set time tracking
    const delta = clock.getDelta(); // Get time difference for smooth animation
    const elapsedTime = clock.getElapsedTime(); // Get total elapsed time    
    // Update helpers to follow spotlights
    if (window.advertSpot1 && window.advertSpot1.userData.helper) {
        window.advertSpot1.userData.helper.update();
    }
    if (window.advertSpot2 && window.advertSpot2.userData.helper) {
        window.advertSpot2.userData.helper.update();
    }
    // Manually update spotlight positions/quaternions to follow animated empties
    if (window.advertSpot1) {
        const empty1 = scene.getObjectByName('advertLight1');
        if (empty1) {
            window.advertSpot1.position.copy(empty1.position);
            // Update target to always be in front of empty
            const target1 = window.advertSpot1.target;
            target1.position.set(0, 0, -1); // local -Z
            empty1.add(target1);
            target1.updateMatrixWorld();
        }
    }
    if (window.advertSpot2) {
        const empty2 = scene.getObjectByName('advertLight2');
        if (empty2) {
            window.advertSpot2.position.copy(empty2.position);
            const target2 = window.advertSpot2.target;
            target2.position.set(0, 0, -1);
            empty2.add(target2);
            target2.updateMatrixWorld();
        }
    }
    if (debugMode && orbitControls) {
        orbitControls.update();
    } else {
        lerpNum(); // drive animation time from scroll/lerp
    }
    requestAnimationFrame(render);

    // Increment SL vars based on position in main animation
    if (meshLoaded) {
        if(!testingMode){
            autoAnimate = player.GetVar("autoAnimate");
            scrollEnabled = player.GetVar("scrollEnabled");
        }
        
        if(autoAnimate){
            if(mixers[0].time < 38.3){
                mixers.forEach(mixer => mixer.update(delta));
            }
            animNum = mixers[0].time;
            animNumTarget = animNum;
        }
        
        if(animNum < 11.9){            
            if (!testingMode) player.SetVar("progressNum_0", (animNum / 11.9));
        }        
        if(animNum > 11.9 && animNum < 13.3){            
            if (!testingMode) player.SetVar("progressNum_1", (animNum - 11.9) * 0.75);
            scene.fog.color.setHex(0xF3F1ED);
            scene.fog.far = 25;
        }
        if(animNum > 13.4 && animNum < 18){
            if (!testingMode) player.SetVar("progressNum_2", (animNum - 13.5) / 4);
            scene.fog.color.setHex(0x222221);
            scene.fog.far = 15;
        }
        if(animNum > 16.9 && animNum < 20.3){
            if (!testingMode) player.SetVar("progressNum_3", (animNum - 17) / 1.3); 
        }
        if(animNum > 24.3 && animNum < 28){
            if (!testingMode) player.SetVar("progressNum_4", (animNum - 24.3) / 3.33);
        }   
        if(animNum > 28.1 && animNum < 31){
            if (!testingMode) player.SetVar("progressNum_5", (animNum - 28.1) / 2.5);
        }
        if(animNum > 31.5){
            if (!testingMode) player.SetVar("progressNum_6", (animNum - 31.5) / 2.5);
        }    
        if(animNum >= 34){
            if (!testingMode) player.SetVar("progressNum_7", (animNum - 34) / 4);
        }    
    }

    renderer.render(scene, camera);
}

function moveLight3() {
    if (animNum > 16.5 && animNum < 25) {
        light3.position.set(animNum - 20.5, 2, -3.5);
    }
    if (animNum > 34) {
        // Gradually move z from -3.5 to 3.5 as animNum goes from 34 to 37.5
        const start = 34;
        const end = 37.5;
        const t = Math.min(Math.max((animNum - start) / (end - start), 0), 1);
        const z = -3.5 + (4.5 + 4.5) * t; // from -3.5 to 3.5
        light3.position.set(light3.position.x, light3.position.y, z);

        const startColor = new THREE.Color(light3.color.getHex());
        const endColor = new THREE.Color(0xE18121);
        light3.color.lerpColors(startColor, endColor, t);

        // Pulse intensity after 34s, continue indefinitely using elapsedTime
        const pulseSpeed = 2; // Pulses per second
        const minIntensity = 0.2;
        const maxIntensity = 5;
        // Use clock.getElapsedTime() for continuous pulsing
        const pulseTime = clock.getElapsedTime();
        const pulse = (Math.sin((pulseTime) * Math.PI * pulseSpeed) + 1) / 2; // 0..1
        light3.intensity = minIntensity + (maxIntensity - minIntensity) * pulse;
    } else {
        // Reset intensity if before pulse
        light3.intensity = 3.25;
    }
}

render();