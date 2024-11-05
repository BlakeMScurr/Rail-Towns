import { Point, doIntersect } from '../../public/js/intersections.mjs';

async function call_api(centre_x, centre_y, radius, max_results, layer_type) {
    var geometry = true
    var key = process.env.key // get API key from browser by looking at the authorization header in network requests to the below url when clicking on a property here https://data.linz.govt.nz/layer/50804-nz-property-titles/
    var layer;
    switch(layer_type) {
        case 'boundaries':
            layer = 50804;
            break;
        case 'addresses':
            layer = 105689;
            break;
        default:
            console.warn("undefined layer type");
            break;
    }
    var query = `https://data.linz.govt.nz/services/query/v1/vector.json/?v=1.2&layer=${layer}&x=${centre_x}&y=${centre_y}&radius=${radius}&max_results=${max_results}&geometry=${geometry}&with_field_names=true`

    var resp = await fetch(query, {
        method: 'get', 
        headers: new Headers({
            'Authorization': `key ${key}`, 
        }), 
    })
    
    const json = await resp.json()
    return json

}

async function get_properties_in_square(centre_x, centre_y, length, depth) {
    // try the circle in which this square is inscribed
    var radius = Math.ceil(Math.sqrt(2 * Math.pow(length/2, 2)))
    var response = await call_api(centre_x, centre_y, radius, 100, 'boundaries')
    var boundaryResults = response.vectorQuery.layers['50804'].features
    var response = await call_api(centre_x, centre_y, radius, 100, 'addresses')
    var addressResults = response.vectorQuery.layers['105689'].features

    // if there were too many boundaryResults for the API to return, split the square into 4 and combine those boundaryResults
    if (boundaryResults.length === 100) {
        const d = (length / 4) / 111111 // Transforms metres to degrees (assumes Earth is a perfect square and that both latitude and longitude can be converted this way)
        var NE = get_properties_in_square(centre_x + d/4, centre_y + d/4, length/2, depth+1)
        var NW = get_properties_in_square(centre_x + d/4, centre_y - d/4, length/2, depth+1)
        var SE = get_properties_in_square(centre_x - d/4, centre_y + d/4, length/2, depth+1)
        var SW = get_properties_in_square(centre_x - d/4, centre_y - d/4, length/2, depth+1)

        return Promise.all([NE, NW, SE, SW]).then(values => {
            return {
                boundaries: [...values[0].boundaries, ...values[1].boundaries, ...values[2].boundaries, ...values[3].boundaries],
                addresses: [...values[0].addresses, ...values[1].addresses, ...values[2].addresses, ...values[3].addresses],
            };
        });
    }

    return {boundaries: boundaryResults, addresses: addressResults}
}

async function main() {
    // Wingatui map corners
    const corner_1 = [170.37331306790603, -45.86717048147928]
    const corner_2 = [170.40074611871748, -45.886132291960315]

    var properties = await get_properties_in_square(170.3877585369411, -45.877485899610825, 10000, 0) // Wingatui Train Station
    var boundaries = properties.boundaries.filter(p => p.geometry.type === 'MultiPolygon');
    
    // ensure uniqueness
    const s = new Set([])
    boundaries.forEach(p => {
        s.add(JSON.stringify(p.geometry.coordinates))
    })

    boundaries = [...s];
    boundaries = boundaries.map(b => JSON.parse(b))

    // make sure all boundaries are in bounds
    boundaries = boundaries.filter(p => {
        var is_in_bounds = false
        p.forEach((shape) => {
            shape.forEach((line) => {
                line.forEach(point => {
                    if (corner_1[0] < point[0] && point[0] < corner_2[0] && corner_1[1] > point[1] && point[1] > corner_2[1]) {
                        is_in_bounds = true
                    }
                })
            })
        })
        return is_in_bounds
    })

    // Handle addresses
    // remove extraneous data
    var addresses = properties.addresses.map(a => {
        return {
            address: a.properties.full_address_ascii,
            coordinate: a.geometry.coordinates,
        }
    })
    
    // ensure uniqueness
    const as = new Set([])
    addresses.forEach(p => {
        as.add(JSON.stringify(p))
    })
    addresses = [...as.values()].map((a) => JSON.parse(a))
    
    // combine addresses and properties
    find_address: for (let m = 0; m < boundaries.length; m++) {
        const multi_shape = boundaries[m];
        for (let s = 0; s < multi_shape.length; s++) {
            const shape = multi_shape[s];
            for (let p = 0; p < addresses.length; p++) {
                const address = addresses[p];
                for (let l = 0; l < shape.length; l++) {
                    const line = shape[l];
                    var intersection_count = 0;
                    for (let i = 0; i < line.length; i++) {
                        const a = line[i];
                        const b = line[(i+1)%line.length];
                        const point = address.coordinate;
                        if (doIntersect(
                            new Point(point[0], point[1]), new Point(point[0], -100000), 
                            new Point(a[0], a[1]), new Point(b[0], b[1]))
                        ) {
                            intersection_count++
                        }
                    }
                    if (intersection_count % 2 == 1) {
                        boundaries[m] = { boundary: boundaries[m], address: addresses[p].address }
                        continue find_address;
                    }
                }
            }
        }
        boundaries[m] = { boundary: JSON.parse(JSON.stringify(boundaries[m])), address: "" }
    }

    console.log("[")
    boundaries.forEach((p, i) => {
        console.log(JSON.stringify(p))
        if (i != boundaries.length - 1) {
            console.log(",")
        }
    })
    console.log("]")
}

main()
