import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.169.0/three.module.min.js';
import * as CSG from '/js/three-csg.mjs';
import { Property } from '/js/property.mjs';
import { haversineDistance } from '/js/haversine.mjs'

const params = {
    zoning: {
        maximumBuildingHeight: 27, // metres
        edgeExclusion: {
            width: 2, // metres
            height: 2, // metres
        }
    },
    suburb: "Wingatui",
    canvasCorners: {
        top_left: [170.37331832405283, -45.867143715592604],
        bottom_right: [170.40063611871748, -45.886102291960315],
    },
    initially_selected_property: 72,
    aesthetic: {
        lineWidth: 1,
        maxZoom: 20,
        colours: {
            mapView: {
                boundaries: "#0096FF",
                hovered: "rgb(0, 150, 255, 0.4)",
                selected: "rgba(189, 88, 38, 0.6)",
            },
            volumeView: {
                earth: 0x568a33,
                selected: 0xbd5826,
                vetoing: 0xAA4A44,
                sky: 0x12a2fc,
                consenting: "",
            },
        }
    }
}

async function f() {
    // Get the image and canvas elements
    const canvas = document.getElementById('overviewCanvas');
    const ctx = canvas.getContext('2d');

    var promise = await fetch("/assets/boundaries/wingatui.json")
    var data = await promise
    var raw_json_data = await data.json()

    var selected_shape = params.initially_selected_property;
    ctx.lineWidth = params.aesthetic.lineWidth;
    
    function resize_shapes() {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;

        properties.forEach(property => {
            property.resizeToCanvas(canvas.width, canvas.height);
        });
    }
    var properties = raw_json_data.map(jsonProperty => {
        return new Property(jsonProperty.address, jsonProperty.boundary, canvas.width, canvas.height, params.canvasCorners.top_left, params.canvasCorners.bottom_right)
    })
    resize_shapes()
    
    var rendernewscene = () => {}

    function render_detail() {
        const detailCanvas = document.getElementById('detailCanvas');
        const overviewCanvas = document.getElementById('overviewCanvas');

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

        const renderer = new THREE.WebGLRenderer();
        renderer.localClippingEnabled = true;
        renderer.setSize( overviewCanvas.width, overviewCanvas.height );
        detailCanvas.replaceWith( renderer.domElement );

        const renderBuildableVolume = (property) => {
            var [paths, deg_per_su, transform] = property.getNormalised()

            // Calculate heights
            // we want to convert metres to screen units. So we want s = metres * su/m = m * su/deg * deg/m
            const distanceInMetres = haversineDistance(
                { latitude: params.canvasCorners.top_left[0], longitude: params.canvasCorners.top_left[1] },
                { latitude: params.canvasCorners.top_left[0], longitude: params.canvasCorners.bottom_right[1] },
            );
            const distanceInDegrees = Math.abs(params.canvasCorners.top_left[1] - params.canvasCorners.bottom_right[1]);
            const deg_per_m = distanceInDegrees/distanceInMetres;
            const su_per_m = deg_per_m / deg_per_su; // (d/m)/(d/su)=(d/m)(su/d)=su/m
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
                const solidMaterial = new THREE.MeshLambertMaterial( { color: params.aesthetic.colours.volumeView.selected, reflectivity: 1 } );
                new_shapes.push(new THREE.Mesh(geometry, solidMaterial));
            })

            // build neighbours
            properties.forEach((property, i) => {
                const paths = transform(property)
                paths.forEach(path => {
                    const shape = new THREE.Shape();
                    shape.moveTo(path[path.length-1][0], path[path.length-1][1]);
                    path.forEach((point) => {
                        shape.lineTo(point[0], point[1] );
                    })

                    const extrudeSettings = {
                        steps: 1,
                        depth: params.zoning.edgeExclusion.height * su_per_m,
                        bevelEnabled: false,
                    };

                    const geometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
                    const baseColour = params.aesthetic.colours.volumeView.vetoing;
                    const redShift = i%5;
                    const amount = 20;
                    const randomisedColour = baseColour - redShift * 16^4 * amount;
                    const solidMaterial = new THREE.MeshLambertMaterial( { 
                        color: randomisedColour,
                        reflectivity: 1 ,
                    } );
                    new_shapes.push(new THREE.Mesh(geometry, solidMaterial));
                })
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
            shapes = renderBuildableVolume(properties[selected_shape])
            shapes.forEach(shape => {
                scene.add(shape)
            })
        }
        // create earth
        const geometry = new THREE.PlaneGeometry( 50, 50 ); 
        const material = new THREE.MeshBasicMaterial( {color: params.aesthetic.colours.volumeView.earth, side: THREE.DoubleSide} );
        const earth = new THREE.Mesh( geometry, material );
        scene.add(earth);

        // create sky
        const skygeo = new THREE.PlaneGeometry( 50, 50 ); 
        const skymaterial = new THREE.MeshBasicMaterial( {color: params.aesthetic.colours.volumeView.sky, side: THREE.DoubleSide} );
        const sky = new THREE.Mesh( skygeo, skymaterial );
        sky.rotation.x += 45;
        sky.position.y += 15;
        scene.add(sky);

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
                shape.rotation.z -= 0.005
            })
            renderer.render( scene, camera );
        }
        renderer.setAnimationLoop( animate );
    }

    render_detail()

    function renderDescription() {
        const addressText = document.getElementById('address');
        var text = properties[selected_shape].address
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
        ctx.fillStyle = params.aesthetic.colours.mapView.selected;
        fill_multishape(properties[selected_shape].canvasBoundaries)
        outline_multishape(properties[selected_shape].canvasBoundaries)
    }

    const drawAllBoundaries = () => {
        ctx.strokeStyle = params.aesthetic.colours.mapView.boundaries;
        properties.forEach(property => {
            outline_multishape(property.canvasBoundaries)
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
                ctx.fillStyle = params.aesthetic.colours.mapView.hovered;
                fill_multishape(properties[hovered_multishape].canvasBoundaries);
            }
        } else {
            document.body.style.cursor = 'default';
        }
    }

    canvas.addEventListener('click', (event) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = (event.clientX - rect.left);
        const mouseY = (event.clientY - rect.top)
        const shifted = ctx.getTransform().inverse().transformPoint({ x: mouseX, y: mouseY })
        var point = [shifted.x, shifted.y];

        for (let i = 0; i < properties.length; i++) {
            if (properties[i].contains(point)) {
                ctx.drawImage(myImage, 0, 0, canvas.width, canvas.height);
                ctx.drawImage(myImage, 0, 0, canvas.width, canvas.height);
                drawAllBoundaries();
                ctx.globalCompositeOperation = "source-over";
                outline_multishape(properties[selected_shape].canvasBoundaries)
                selected_shape = i
                drawSelected()
                rendernewscene()
                renderDescription()
                return
            }
        }
    }) 

    canvas.addEventListener('mousemove', (event) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = (event.clientX - rect.left);
        const mouseY = (event.clientY - rect.top)
        const shifted = ctx.getTransform().inverse().transformPoint({ x: mouseX, y: mouseY })
        var point = [shifted.x, shifted.y];

        if (hovered_multishape != -1 && properties[hovered_multishape].contains(point)) {
            drawHighlighting(hovered_multishape)
            return
        }

        var new_hovered = -1
        for (let i = 0; i < properties.length; i++) { // TODO: optimise this by checking neighbours first
            if (properties[i].contains(point)) {
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
        resize_shapes()
        ctx.drawImage(myImage, 0, 0, canvas.width, canvas.height);
        drawAllBoundaries()
        drawHighlighting(hovered_multishape, true)
        drawSelected()
    })

    // Zooming on a computer (trackpads create wheel events)
    // TODO: ensure zooming and resizing work together
    const zoomHandler = (factor, centre) => {
        const initialT = ctx.getTransform()
        if (initialT.a * factor > 1 && initialT.a * factor < params.aesthetic.maxZoom) { // Don't zoom out further than the specified suburb
            const zoomCentre = initialT.inverse().transformPoint(centre);
            ctx.lineWidth = params.aesthetic.lineWidth / (Math.pow(initialT.a, 1/2)); // keeps line width identical regardless of zoom level

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
            panHandler(e.movementX, e.movementY)
        }
    });
}

f()