import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import Stats from 'three/addons/libs/stats.module.js';

import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

let camera, scene, bgTexture, renderer, composer, stats;
let displayCase, card, glassMaterial, iridescenceMaterial, img1, img2, img3;
let INTERSECTED, intersectRaycaster;
let sceneParams;
let autoRotate = false;

const objects = [];
const pickedObj = [];
const pointer = new THREE.Vector2();

sceneParams = {
    scene: 'Clouds',
    texture: 'Cerveau',
    rotation: true
};

init();
animate();

function init() {

    const container = document.getElementById('container');

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    document.body.appendChild(renderer.domElement);

    stats = new Stats();
    container.appendChild(stats.dom);

    //
    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.z = 4;

    scene = new THREE.Scene();

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(-.45, 0, 1).normalize();
    scene.add(light);

    const light2 = new THREE.DirectionalLight(0xffffff, 10);
    light2.position.set(1, .5, 0).normalize();
    scene.add(light2);

    bgTexture = new EXRLoader().load('textures/cloudy_sky.exr', function (texture) {

        texture.mapping = THREE.EquirectangularReflectionMapping;
        //scene.background = texture;
        scene.environment = texture;
    });

    img1 = new THREE.TextureLoader().load('textures/cerveau.jpg');
    img2 = new THREE.TextureLoader().load('textures/audermars.png');
    img3 = new THREE.TextureLoader().load('textures/Dior_fullsize.png');

    // Glass Material
    glassMaterial = new THREE.MeshPhysicalMaterial({
        envMap: scene.environment,
        transparent: true,
        color: 0xffffff,
        transmission: 1,
        opacity: 1,
        metalness: 0.2,
        roughness: 0,
        thickness: 0.2,
        iridescence: 0
    });

    // Iridescence Material
    iridescenceMaterial = new THREE.MeshPhysicalMaterial({
        roughness: 0,
        metalness: 1,
        emissive: 0,
        iridescence: 1,
        iridescenceIOR: 1.94,
        iridescenceThicknessRange: [100, 400]
    });

    // Medaillon
    new GLTFLoader()
        .setPath('models/gltf/Medaillon/')
        .setDRACOLoader(new DRACOLoader().setDecoderPath('jsm/libs/draco/gltf/'))
        .load('medaillon_WebGL02.glb', function (gltf) {

            displayCase = gltf.scene;
            displayCase.getObjectByName('DisplayCase_1').material = iridescenceMaterial;
            displayCase.getObjectByName('DisplayCase_3').material = glassMaterial;

            card = displayCase.getObjectByName('DisplayCase_2');
            card.material.emissiveMap.anisotropy = renderer.capabilities.getMaxAnisotropy();

            scene.add(displayCase);
            objects.push(displayCase);
        });

    // Postprocessing
    composer = new EffectComposer(renderer);

    const smaaPass = new SMAAPass(
        window.innerWidth * renderer.getPixelRatio(),
        window.innerHeight * renderer.getPixelRatio());

    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0.3;//0.2;
    bloomPass.strength = 0.3;//0.7;
    bloomPass.radius = 0.2;//0.2;

    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(bloomPass);
    composer.addPass(smaaPass);

    window.addEventListener('resize', onWindowResize);

    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mouseup', onMouseUp);

    // Scene GUI
    const gui = new GUI();

    gui.add(sceneParams, 'rotation').onChange(function (bool) {



    })

    gui.add(sceneParams, 'scene', ['Clouds', 'Background', 'Glow']).onChange(function (value) {

        switch (value) {
            case 'Clouds':
                scene.background = null;
                break;
            case 'Background':
                scene.background = bgTexture;
                break;
            case 'Glow':
                scene.background = bgTexture;
                break;
        }
        render();
    });

    const folder = gui.addFolder('Card Image');

    folder.add(sceneParams, 'texture', ['Cerveau', 'Audermars', 'Dior']).onChange(function (value) {

        switch (value) {

            case 'Cerveau':
                card.material.emissiveMap = img1;
                break;
            case 'Audermars':
                card.material.emissiveMap = img2;
                break;
            case 'Dior':
                card.material.emissiveMap = img3;
                break;
        }

        card.material.emissiveMap.flipY = false;

        render();

    });
}

// Card user rotation control
intersectRaycaster = new THREE.Raycaster();

var mouseDown = false,
    mouseX = 0,
    mouseY = 0;

function onMouseDown(event) {

    event.preventDefault();
    mouseDown = true;
    autoRotate = true;
    mouseX = event.clientX;
    mouseY = event.clientY;

    intersectRaycaster.setFromCamera(pointer, camera);

    const intersects = intersectRaycaster.intersectObjects(objects);

    if (intersects.length > 0) {
        console.log("found");
        pickedObj.push(intersects[0].object);
    }
}

function onMouseUp(event) {

    event.preventDefault();
    mouseDown = false;
    autoRotate = false;
    pickedObj.length = 0;
}

function onMouseMove(event) {

    event.preventDefault();

    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;

    var deltaX = event.clientX - mouseX,
        deltaY = event.clientY - mouseY;
    mouseX = event.clientX;
    mouseY = event.clientY;

    rotateObject(deltaX, deltaY);

    intersectRaycaster.setFromCamera(pointer, camera);

    const intersects = intersectRaycaster.intersectObjects(objects);

    if (intersects.length > 0) {

        if (INTERSECTED != intersects[0].object) {

            INTERSECTED = intersects[0].object;
            displayCase.scale.set(1.05, 1.05, 1.05);

            renderer.domElement.style.cursor = 'pointer';
        }

    } else {

        if (INTERSECTED) {

            displayCase.scale.set(1, 1, 1);
        }
        INTERSECTED = null;

        renderer.domElement.style.cursor = '';
    }
}

function rotateObject(deltaX, deltaY) {

    if (mouseDown && pickedObj.length > 0) displayCase.rotation.y += deltaX / 100;
}

function onWindowResize() {

    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    composer.setSize(width, height);
}

function animate() {

    requestAnimationFrame(animate);

    stats.begin();

    if (displayCase != null && !autoRotate && sceneParams.rotation) {
        displayCase.rotation.y -= 0.02;
    }

    render();

    stats.end();
}

function render() {
    switch (sceneParams.scene) {
        case 'Clouds':
            renderer.render(scene, camera);
            break;
        case 'Background':
            renderer.render(scene, camera);
            break;
        case 'Glow':
            composer.render();
            break;
    }
}