import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.169.0/three.module.min.js';
import { doIntersect, Point } from '/js/intersections.mjs';
import { haversineDistance } from '/js/haversine.mjs'

const params = {
    zoning: {
        maximumBuildingHeight: 27, // metres
    },
    suburb: "Wingatui",
    initially_selected_property: 72,
}

async function f() {
    // Get the image and canvas elements
    const canvas = document.getElementById('overviewCanvas');
    const ctx = canvas.getContext('2d');

    var promise = await fetch("/assets/boundaries/wingatui.json")
    var data = await promise
    var raw_json_data = await data.json()

    var selected_shape = params.initially_selected_property;

    const corner_1 = [170.37331306790603, -45.86717048147928]
    const corner_2 = [170.40074611871748, -45.886132291960315]

    const x_factor = Math.abs(corner_1[0] - corner_2[0])
    const y_factor = Math.abs(corner_1[1] - corner_2[1])

    function resize_shapes(json) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;

        const latitude_to_canvas = (point) => {
            const translated = [point[0] - corner_1[0], point[1] - corner_2[1]]
            const normalised = [translated[0] / x_factor, translated[1] / y_factor]
            const stretched = [normalised[0] * canvas.width, normalised[1] * canvas.width]
            const inverted = [stretched[0], canvas.height - stretched[1]]
            return inverted
        }

        return json.map(multi_shape => {
            return { 
                address: multi_shape.address,
                boundary: multi_shape["boundary"].map(nest => {
                    return nest.map(shape => {
                        return shape.map(point => {
                            return latitude_to_canvas(point)
                        })
                    })
                })
            }
        })
    }

    var multi_shapes = resize_shapes(raw_json_data)

    var rendernewscene = () => {}

    function render_detail() {
        const detailCanvas = document.getElementById('detailCanvas');
        const overviewCanvas = document.getElementById('overviewCanvas');

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

        const renderer = new THREE.WebGLRenderer();
        renderer.setSize( overviewCanvas.width, overviewCanvas.height );
        detailCanvas.replaceWith( renderer.domElement );

        const renderBuildableVolume = (multishape) => {
            var lowest_x = Infinity;
            var lowest_y = Infinity;

            multishape.forEach((shape) => {
                shape[0].forEach(point => { // TODO: why does this extra nesting seem to only be relevant here?
                    if (point[0] < lowest_x) {
                        lowest_x = point[0]
                    }
                    if (point[1] < lowest_y) {
                        lowest_y = point[1]
                    }
                })
            })

            var deg_per_su = 0;
            var paths = multishape.map((shape) => {
                const rawPath = shape[0]
                const positivePath = rawPath.map((point) => [point[0] - lowest_x, point[1] - lowest_y])
                
                positivePath.forEach(point => {
                    if (point[0] > deg_per_su) {
                        deg_per_su = point[0];
                    }
                    if (point[1] > deg_per_su) {
                        deg_per_su = point[1];
                    }
                })
                return positivePath;
                
            })

            paths = paths.map((positivePath) => {
                const normalisedPath = positivePath.map((point) => [point[0]/deg_per_su, point[1]/deg_per_su])
                return normalisedPath.map((point) => [point[0]-0.5, point[1]-0.5])
            })

            // Calculate heights
            // we want to convert metres to screen units. So we want s = metres * su/m = m * su/deg * deg/m
            const distanceInMetres = haversineDistance(
                { latitude: corner_1[0], longitude: corner_1[1] },
                { latitude: corner_1[0], longitude: corner_2[1] },
            );
            const distanceInDegrees = Math.abs(corner_1[1] - corner_2[1]);
            const deg_per_m = distanceInDegrees/distanceInMetres;
            const su_per_m = deg_per_m / deg_per_su;
            const buildable_height = params.zoning.maximumBuildingHeight * su_per_m;

            const new_shapes = []

            paths.forEach(path => {
                const shape = new THREE.Shape();
                shape.moveTo(path[path.length-1][0], path[path.length-1][1]);
                path.forEach((point) => {
                    shape.lineTo(point[0], point[1] );
                })
    
                const extrudeSettings = {
                    steps: 1,
                    depth: buildable_height,
                    bevelEnabled: false,
                };
    
                const geometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
                const solidMaterial = new THREE.MeshLambertMaterial( { color: 0xAA4A44, reflectivity: 1 } );
                new_shapes.push(new THREE.Mesh(geometry, solidMaterial));
            })
            return new_shapes;
        }

        var shapes = [];
        rendernewscene = () => {
            // remove old property
            shapes.forEach(shape => {
                scene.remove(shape)
            })

            // add new property
            shapes = renderBuildableVolume(raw_json_data[selected_shape].boundary)
            shapes.forEach(shape => {
                scene.add(shape)
            })
        }
        // create ground
        const geometry = new THREE.CircleGeometry( 5, 32 ); 
        const material = new THREE.MeshBasicMaterial( {color: 0x8BBF8C, side: THREE.DoubleSide} );
        const ground = new THREE.Mesh( geometry, material );
        scene.add(ground);

        // create suns
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
        directionalLight.position.z = 1
        directionalLight.position.y = -1
        scene.add(directionalLight)

        const light2 = new THREE.DirectionalLight(0xffffff, 1)
        light2.position.z = 1
        light2.position.y = -1
        light2.position.x = -1

        const light3 = new THREE.DirectionalLight(0xffffff, 3)
        light3.position.z = 1
        scene.add(light3)

        rendernewscene()

        const camera_distance = 2;

        camera.position.z = camera_distance/2;
        camera.position.y = -camera_distance;
        camera.rotation.x += Math.PI/6*2;

        function animate() {
            shapes.forEach(shape => {
                shape.rotation.z -= 0.01
            })
            renderer.render( scene, camera );
        }
        renderer.setAnimationLoop( animate );
    }

    render_detail()

    function renderDescription() {
        const addressText = document.getElementById('address');
        var text = multi_shapes[selected_shape].address
        if (text === "") {
            text = "Unknown Address"
        }
        addressText.innerText = text
    }

    renderDescription()
    
    const outline_multishape = (multi_shape) => {
        multi_shape.forEach(shape => {
            make_shape(shape)
            ctx.stroke();
        })
    }

    const fill_multishape = (multi_shape) => {
        multi_shape.forEach(shape => {
            make_shape(shape)
            ctx.fill();
        })
    }

    const make_shape = (shape) => {
        ctx.beginPath();
        ctx.moveTo(shape[shape.length-1][0], shape[shape.length-1][1]);
        shape.forEach((line) => {
            line.forEach((point) => {
                ctx.lineTo(point[0], point[1]);
            })
        })
        ctx.closePath();
        ctx.stroke();
    }


    const drawSelected = () => {
        ctx.fillStyle = "#AA4A44"
        fill_multishape(multi_shapes[selected_shape].boundary)
        outline_multishape(multi_shapes[selected_shape].boundary)
    }

    const drawAllBoundaries = () => {
        ctx.strokeStyle = 'rgb(0, 150, 255)';
        ctx.lineWidth = 0.5;
        multi_shapes.forEach(multi_shape => {
            outline_multishape(multi_shape.boundary)
        })
    }
    
    const myImage = new Image(canvas.width, canvas.height);
    myImage.src = "/assets/wingatui.webp";
    myImage.onload = () => {
        ctx.drawImage(myImage, 0, 0, canvas.width, canvas.height);
        drawAllBoundaries()
        drawSelected()
    }
    
    var hovered_multishape = -1;
    const drawHighlighting = (new_hovered, is_new = false) => {
        if (hovered_multishape != new_hovered) {
            // Completely redraw everything
            ctx.drawImage(myImage, 0, 0, canvas.width, canvas.height);
            drawAllBoundaries();
            drawSelected();
            
            hovered_multishape = new_hovered;
            is_new = true;
        }
    
        if (hovered_multishape != -1) {
            if (is_new) {
                document.body.style.cursor = 'pointer';
                ctx.fillStyle = "rgb(0, 150, 255, 0.4)";
                fill_multishape(multi_shapes[hovered_multishape].boundary);
            }
        } else {
            document.body.style.cursor = 'default';
        }
    }

    const multi_shape_contains_point = (multi_shape, point) => {
        for (let s = 0; s < multi_shape.length; s++) {
            const shape = multi_shape[s];
            for (let l = 0; l < shape.length; l++) {
                const line = shape[l];
                var intersection_count = 0;
                for (let i = 0; i < line.length; i++) {
                    const a = line[i];
                    const b = line[(i+1)%line.length];
                    if (doIntersect(new Point(point[0], point[1]), new Point(point[0], -100000), new Point(a[0], a[1]), new Point(b[0], b[1]))) {
                        intersection_count++
                    }
                }
                if (intersection_count % 2 == 1) {
                    return true
                }
            }
        }
    }

    var endingPan = false;
    canvas.addEventListener('click', (event) => {
        if (!endingPan) {
            const rect = canvas.getBoundingClientRect();
            const mouseX = (event.clientX - rect.left);
            const mouseY = (event.clientY - rect.top)
            const shifted = ctx.getTransform().inverse().transformPoint({ x: mouseX, y: mouseY })
            var point = [shifted.x, shifted.y];

            for (let i = 0; i < multi_shapes.length; i++) {
                if (multi_shape_contains_point(multi_shapes[i].boundary, point)) {
                    ctx.drawImage(myImage, 0, 0, canvas.width, canvas.height);
                    ctx.drawImage(myImage, 0, 0, canvas.width, canvas.height);
                    drawAllBoundaries();
                    ctx.globalCompositeOperation = "source-over";
                    outline_multishape(multi_shapes[selected_shape].boundary)
                    selected_shape = i
                    drawSelected()
                    rendernewscene()
                    renderDescription()
                    return
                }
            }
        }
        endingPan = false
    }) 

    canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = (event.clientX - rect.left);
        const mouseY = (event.clientY - rect.top)
        const shifted = ctx.getTransform().inverse().transformPoint({ x: mouseX, y: mouseY })
        var point = [shifted.x, shifted.y];

        if (hovered_multishape != -1 && multi_shape_contains_point(multi_shapes[hovered_multishape].boundary, point)) {
            drawHighlighting(hovered_multishape)
            return
        }

        var new_hovered = -1
        for (let i = 0; i < multi_shapes.length; i++) { // TODO: optimise this by checking neighbours first
            if (multi_shape_contains_point(multi_shapes[i].boundary, point)) {
                new_hovered = i
                break
            }
        }

        drawHighlighting(new_hovered)
    });

    canvas.addEventListener('mouseleave', (_) => {
        drawHighlighting(-1)
    })

    window.addEventListener('resize', () => {
        multi_shapes = resize_shapes(raw_json_data)
        ctx.drawImage(myImage, 0, 0, canvas.width, canvas.height);
        drawAllBoundaries()
        drawHighlighting(hovered_multishape, true)
        drawSelected()
    })

    // Zooming on a computer (trackpads create wheel events)
    // TODO: ensure zooming and resizing work together
    const zoomHandler = (factor, centre) => {
        const initialT = ctx.getTransform()
        if (initialT.a * factor > 1) { // Don't zoom out further than the specified suburb
            const zoomCentre = initialT.inverse().transformPoint(centre);

            // Moves the origin to the cursor, scales, then moves back to keep the cursor's point static
            ctx.translate(zoomCentre.x, zoomCentre.y)
            ctx.scale(factor, factor)
            ctx.translate(-zoomCentre.x, -zoomCentre.y)

            const t = ctx.getTransform()
            // make sure we don't exceed the current suburb
            if (t.e > 0) {
                t.e = 0;
            }
            if (t.f > 0) {
                t.f = 0;
            }
            const xMin = -1 * canvas.width * t.a + canvas.width; // full width minus a screen TODO: explain better
            const yMin = -1 * canvas.height * t.a + canvas.height
            if (t.e < xMin) {
                t.e = xMin;
            }
            if (t.f < yMin) {
                t.f = yMin;
            }
            ctx.setTransform(t)
        }

        // Redraw
        ctx.clearRect(0, 0,canvas.width, canvas.height)

        ctx.drawImage(myImage, 0, 0, canvas.width, canvas.height);
        drawAllBoundaries()
        drawHighlighting(hovered_multishape, true)
        drawSelected()
    }

    const panHandler = (dx, dy) => {
        const t = ctx.getTransform();
        dx = dx / t.a;
        dy = dy / t.a;
        if (t.e + dx > 0) {
            dx = -t.e / t.a
        }
        if (t.f + dy > 0) {
            dy = -t.f / t.a;
        }
        const xMin = -1 * canvas.width * t.a + canvas.width; // full width minus a screen TODO: explain better
        const yMin = -1 * canvas.height * t.a + canvas.height
        if (t.e + dx < xMin) {
            dx = (xMin - t.e) / t.a;
        }
        if (t.f + dy < yMin) {
            dy = (yMin - t.f) / t.a;
        }
        ctx.translate(dx, dy)
        ctx.drawImage(myImage, 0, 0, canvas.width, canvas.height);
        drawAllBoundaries()
        drawHighlighting(hovered_multishape, true)
        drawSelected()
    }

    // Zooming with a mouse (including trackpad)
    canvas.addEventListener('wheel', (e) => {
        console.log("preventing default")
        e.preventDefault() // don't zoom the page
        const factor = Math.pow(0.99, e.deltaY)
        const rect = canvas.getBoundingClientRect();
        zoomHandler(factor, {x: e.clientX - rect.left, y: e.clientY - rect.top})
    })

    // Zooming on touch devices
    // Calculate distance between two fingers
    const distance = (event) => {
        return Math.hypot(event.touches[0].pageX - event.touches[1].pageX, event.touches[0].pageY - event.touches[1].pageY);
    };

    var prevX = 0;
    var prevY = 0;
    var lastDistance = 0;
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault()
            lastDistance = distance(e)
        } else if (e.touches.length === 1) {
            prevX = e.touches[0].clientX
            prevY = e.touches[0].clientY
        }
    })

    var isZooming = false;
    canvas.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            isZooming = true
            e.preventDefault()
            const newDistance = distance(e)
            const rect = canvas.getBoundingClientRect();
            const centre = {
                x: (e.touches[0].clientX + e.touches[1].clientX)/2 - rect.left,
                y: (e.touches[0].clientY + e.touches[1].clientY)/2 - rect.top,
            }
            zoomHandler(newDistance/lastDistance, centre)
            lastDistance = newDistance
        } else if (e.touches.length === 1 && !isZooming) {
            e.preventDefault()
            const newX = e.touches[0].clientX
            const newY = e.touches[0].clientY
            panHandler(newX - prevX, newY - prevY)
            prevX = newX
            prevY = newY
            document.getElementById('address').innerText = JSON.stringify(e.touches[0])
        }
    })

    canvas.addEventListener('touchend', (e) => {
        if (e.touches.length === 0) {
            isZooming = false;
        }
    })

    // panning
    var mouseIsDown = false;
    canvas.addEventListener('mousedown', (_) => {
        mouseIsDown = true;
    })
    window.addEventListener('mouseup', (_) => {
        mouseIsDown = false;
    })
    window.addEventListener('mousemove', (e) => {
        if (mouseIsDown) {
            endingPan = true
            panHandler(e.movementX, e.movementY)
        }
    });
}

f()