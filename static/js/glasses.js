const modelName = document.getElementById("modelName").textContent;


const video = document.getElementById('video');

Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('../static/models/tiny_face_detector_model-weights_manifest.json'),
    faceapi.nets.faceLandmark68Net.loadFromUri('../static/models/face_landmark_68_model-weights_manifest.json'),
    faceapi.nets.faceRecognitionNet.loadFromUri('../static/models/face_recognition_model-weights_manifest.json')
]).then(startVideo)

function startVideo() {
    navigator.getUserMedia(
        { video: {} },
        stream => video.srcObject = stream,
        err => console.error(err)
    )
}

var renderer,
    scene,
    camera,
    myCanvas = document.getElementById('canvas');

//RENDERER
renderer = new THREE.WebGLRenderer({
    canvas: myCanvas,
    antialias: true,
    transparent: true
});
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(720, 560);

//CAMERA
camera = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.01, 5000);
camera.position.y = 30;
camera.position.z = 70;

//SCENE
scene = new THREE.Scene();

var vidTexture = new THREE.VideoTexture(video);
scene.background = vidTexture;


//LIGHTS
var light = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(light);

var light2 = new THREE.PointLight(0xffffff, 0.5);
scene.add(light2);

var loader = new THREE.GLTFLoader();

var mesh_width;
var mesh_left;
var mesh_right;

loader.load(`../static/glasses_models/${modelName}_width.glb`, function (gltf) {
    mesh_width = material(gltf);
});
loader.load(`../static/glasses_models/${modelName}_left.glb`, function (gltf) {
    mesh_left = material(gltf);
});
loader.load(`../static/glasses_models/${modelName}_right.glb`, function (gltf) {
    mesh_right = material(gltf);
});

function material(gltf) {
    mesh = gltf.scene;
    var lenses_number;
    for (let i = 0; i < 2; i++) {
        if (mesh.children[i].name == "lenses") {
            lenses_number = i;
        }
    }
    mesh.children[lenses_number].material = new THREE.MeshLambertMaterial({
        color: new THREE.Color().setHex(0xA4ACDD),
        opacity: 0.4,
        transparent: true
    });
    return mesh;
}




keyboard = new KeyboardState();


//RENDER LOOP
var delta = 0;
var prevTime = Date.now();

function rotationX(leftEye, rightEye, jaw) {
    const nod = leftEye._y - jaw[0]._y;
    return nod * Math.PI / 450;
}

function rotationY(leftEye, rightEye, jaw) {
    let headShake = (jaw[0]._x - leftEye._x) - (rightEye._x - jaw[1]._x);
    return - headShake * Math.PI / 550;
}

function rotationZ(leftEye, rightEye) {
    const length = Math.sqrt((rightEye._x - leftEye._x) ** 2 + (rightEye._y - leftEye._y) ** 2);
    return - Math.asin((rightEye._y - leftEye._y) / length);
}

function scale(leftEye, rightEye) {
    const length = Math.sqrt((rightEye._x - leftEye._x) ** 2 + (rightEye._y - leftEye._y) ** 2);
    return (length-160) / 2;
}

var mesh;
function render(leftEye, rightEye, jaw) {
    if (!mesh){
        mesh = mesh_width;
        scene.add(mesh);
    }

    if (Math.abs(rotationY(leftEye, rightEye, jaw) - 0.06) < 0.05) {
        while(scene.children.length > 0){
            scene.remove(scene.children[0]);
        }
        mesh = mesh_width;
        scene.add(mesh);
    } else {
        if (rotationY(leftEye, rightEye, jaw) > 0.06){
            while(scene.children.length > 0){
                scene.remove(scene.children[0]);
            }
            mesh = mesh_left;
            scene.add(mesh);
        } else {
            while(scene.children.length > 0){
                scene.remove(scene.children[0]);
            }
            mesh = mesh_right;
            scene.add(mesh);

        }
    }

    if (mesh) {
        const x = (leftEye._x + rightEye._x) / 2;
        const y = (leftEye._y + rightEye._y) / 2;
        mesh.position.y = - y / 560 * 100 + 72;
        mesh.position.x = x / 720 * 100 - 50;
        mesh.rotation.x = rotationX(leftEye, rightEye, jaw);
        mesh.rotation.y = rotationY(leftEye, rightEye, jaw);
        mesh.rotation.z = rotationZ(leftEye, rightEye);
        mesh.position.z = scale(leftEye, rightEye);
    }
    renderer.render(scene, camera);

}



video.addEventListener('play', () => {
    const canvas = faceapi.createCanvasFromMedia(video)
    document.body.append(canvas)
    const displaySize = { width: video.width, height: video.height }
    faceapi.matchDimensions(canvas, displaySize)

    setInterval(async () => {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks()
        const resizedDetections = faceapi.resizeResults(detections, displaySize)

        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)

        if (resizedDetections[0]) {
            if (canvas.getContext) {
                const leftEye = faceapi.getCenterPoint(resizedDetections[0].landmarks.getLeftEye());
                const rightEye = faceapi.getCenterPoint(resizedDetections[0].landmarks.getRightEye());
                const jaw =[resizedDetections[0].landmarks.getJawOutline()[0], resizedDetections[0].landmarks.getJawOutline()[16]];
                render(leftEye, rightEye, jaw);
            }
        }

    }, 300)
})