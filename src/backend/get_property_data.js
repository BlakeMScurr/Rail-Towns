async function call_api(centre_x, centre_y, radius, max_results) {
    var geometry = true
    var key = process.env.key // get API key from browser by looking at the authorization header in network requests to the below url when clicking on a property here https://data.linz.govt.nz/layer/50804-nz-property-titles/
    var query = `https://data.linz.govt.nz/services/query/v1/vector.json/?v=1.2&layer=50804&x=${centre_x}&y=${centre_y}&radius=${radius}&max_results=${max_results}&geometry=${geometry}&with_field_names=true`

    var resp = await fetch(query, {
        method: 'get', 
        headers: new Headers({
            'Authorization': `key ${key}`, 
        }), 
    })
    
    json = await resp.json()
    return json

}

async function get_properties_in_square(centre_x, centre_y, length, depth) {
    // try the circle in which this square is inscribed
    var radius = Math.ceil(Math.sqrt(2 * Math.pow(length/2, 2)))
    var response = await call_api(centre_x, centre_y, radius, 100)
    var results = response.vectorQuery.layers['50804'].features

    // if there were too many results for the API to return, split the square into 4 and combine those results
    if (results.length === 100) {
        d = (length / 4) / 111111 // Transforms metres to degrees (assumes Earth is a perfect square and that both latitude and longitude can be converted this way)
        var NE = get_properties_in_square(centre_x + d/4, centre_y + d/4, length/2, depth+1)
        var NW = get_properties_in_square(centre_x + d/4, centre_y - d/4, length/2, depth+1)
        var SE = get_properties_in_square(centre_x - d/4, centre_y + d/4, length/2, depth+1)
        var SW = get_properties_in_square(centre_x - d/4, centre_y - d/4, length/2, depth+1)

        return Promise.all([NE, NW, SE, SW]).then(values => {
            return [...values[0], ...values[1], ...values[2], ...values[3]];
        });
    }

    return results
}

async function main() {
    // Wingatui map corners
    corner_1 = [170.37331306790603, -45.86717048147928]
    corner_2 = [170.40074611871748, -45.886132291960315]

    var properties = await get_properties_in_square(170.3877585369411, -45.877485899610825, 20000, 0) // Wingatui Train Station
    properties = properties.filter(p => p.geometry.type === 'MultiPolygon');
    
    // ensure uniqueness
    const s = new Set([])
    properties.forEach(p => {
        s.add(JSON.stringify(p.geometry.coordinates))
    })

    properties = [...s];

    properties = properties.filter(p => {
        p = JSON.parse(p)
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

    console.log("[")
    properties.forEach((p, i) => {
        console.log(p)
        if (i != properties.length - 1) {
            console.log(",")
        }
    })
    console.log("]")
}

main()
