import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.169.0/three.module.min.js';
import { doIntersect, Point } from '/js/intersections.mjs';

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

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    
    var promise = await fetch("/assets/boundaries/wingatui.json")
    var data = await promise
    var multi_shapes = await data.json()

    var selected_shape = params.initially_selected_property;

    var rendernewscene = () => {}

    function render_detail() {
        const detailCanvas = document.getElementById('detailCanvas');
        const overviewCanvas = document.getElementById('overviewCanvas');

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

        const renderer = new THREE.WebGLRenderer();
        renderer.setSize( overviewCanvas.width, overviewCanvas.height );
        detailCanvas.appendChild( renderer.domElement );

        const create_multishape = (multishape) => {
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

            var highest_value = 0;
            var paths = multishape.map((shape) => {
                const rawPath = shape[0]
                const positivePath = rawPath.map((point) => [point[0] - lowest_x, point[1] - lowest_y])
                
                positivePath.forEach(point => {
                    if (point[0] > highest_value) {
                        highest_value = point[0];
                    }
                    if (point[1] > highest_value) {
                        highest_value = point[1];
                    }
                })
                return positivePath;
                
            })

            paths = paths.map((positivePath) => {
                const normalisedPath = positivePath.map((point) => [point[0]/highest_value, point[1]/highest_value])
                return normalisedPath.map((point) => [point[0]-0.5, point[1]-0.5])
            })


            const depth = 0.5;

            const new_shapes = []

            paths.forEach(path => {

                const shape = new THREE.Shape();
                shape.moveTo(path[path.length-1][0], path[path.length-1][1]);
                path.forEach((point) => {
                    shape.lineTo(point[0], point[1] );
                })
    
                const extrudeSettings = {
                    steps: 1,
                    depth: depth,
                    bevelEnabled: false,
                };
    
                const geometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
                const solidMaterial = new THREE.MeshBasicMaterial( { color: "rgba(255, 0, 0, 0.5)" } );
                const wireMaterial = new THREE.MeshBasicMaterial( { color: 0x00ff00, wireframe: true } );
                new_shapes.push([new THREE.Mesh( geometry, solidMaterial ), new THREE.Mesh( geometry, wireMaterial )]);
            })
            return new_shapes;
        }

        var shapes = [];
        rendernewscene = () => {
            shapes.forEach(shape => {
                scene.remove(shape[0])
                scene.remove(shape[1])
            })
            shapes = create_multishape(multi_shapes[selected_shape].boundary)
            shapes.forEach(shape => {
                scene.add(shape[0])
                scene.add(shape[1])
            })
        }

        rendernewscene()

        const camera_distance = 2;

        camera.position.z = camera_distance;
        camera.position.y = -camera_distance;
        camera.rotation.x += Math.PI/4

        function animate() {
            shapes.forEach(shape => {
                shape[0].rotation.z += 0.01;
                shape[1].rotation.z += 0.01;
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
    
    const corner_1 = [170.37331306790603, -45.86717048147928]
    const corner_2 = [170.40074611871748, -45.886132291960315]

    const x_factor = Math.abs(corner_1[0] - corner_2[0])
    const y_factor = Math.abs(corner_1[1] - corner_2[1])

    const latitude_to_canvas = (point) => {
        const translated = [point[0] - corner_1[0], point[1] - corner_2[1]]
        const normalised = [translated[0] / x_factor, translated[1] / y_factor]
        const stretched = [normalised[0] * canvas.width, normalised[1] * canvas.width]
        const inverted = [stretched[0], canvas.height - stretched[1]]
        return inverted
    }

    var multi_shapes = multi_shapes.map(multi_shape => {
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

    ctx.strokeStyle = 'rgb(0, 150, 255)';
    ctx.lineWidth = 0.5;

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


    multi_shapes.forEach(multi_shape => {
        outline_multishape(multi_shape.boundary)
    })

    drawSelected()

    
    var hovered_multishape = -1;
    const drawHighlighting = (new_hovered) => {
        var is_new = false
        if (hovered_multishape != new_hovered) {
            if (hovered_multishape != -1) {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.fillStyle = "rgba(0, 0, 0, 1)"
                fill_multishape(multi_shapes[hovered_multishape].boundary)
                ctx.globalCompositeOperation = "source-over";
                if (hovered_multishape != selected_shape) {
                    outline_multishape(multi_shapes[hovered_multishape].boundary)
                } else {
                    drawSelected()
                }
            }

            hovered_multishape = new_hovered
            is_new = true
        }

        if (hovered_multishape != -1) {
            if (is_new) {
                document.body.style.cursor = 'pointer';
                ctx.fillStyle = "rgb(0, 150, 255, 0.4)"
                fill_multishape(multi_shapes[hovered_multishape].boundary)
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

    canvas.addEventListener('click', (event) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = (event.clientX - rect.left);
        const mouseY = (event.clientY - rect.top)
        const point = [mouseX, mouseY];

        for (let i = 0; i < multi_shapes.length; i++) {
            if (multi_shape_contains_point(multi_shapes[i].boundary, point)) {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.fillStyle = "rgba(0, 0, 0, 1)"
                fill_multishape(multi_shapes[selected_shape].boundary)
                ctx.globalCompositeOperation = "source-over";
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
        const point = [mouseX, mouseY];

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

    // TODO: zooming and panning

}

f()