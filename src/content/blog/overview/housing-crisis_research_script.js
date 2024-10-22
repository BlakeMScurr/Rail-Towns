// Amortization formula taken from https://en.wikipedia.org/wiki/Amortization_calculator
calculate_payment = (interest_rate, principle, years) => {
    monthly_interest_rate = interest_rate / 12 // we use /12 rather than 12th root because of the banks' scam around nominal interest rates vs effective interest rates
    months = years * 12
    return principle * monthly_interest_rate / (1- Math.pow((1 + monthly_interest_rate), -months))
}
// console.log(calculate_payment(0.0766, 300000, 30))
// console.log(calculate_payment(0.0735, 600000, 30))

async function fetchData() {
    startDates = []
    for (let i = 1998; i < 2024; i++) {
        startDates.push(i + "0331")
        startDates.push(i + "0630")
        startDates.push(i + "0930")
        startDates.push(i + "1231")
    }

    startDates.push("20240331")
    startDates.push("20240630")

    wages = 5
    housing = 6

    endDate = "20240630" // June 2024
    for (let i = 0; i < startDates.length; i++) {
        req = `https://www.rbnz.govt.nz/api/inflcalc/v1/calculate?categoryId=${housing}&fromDate=${startDates[i]}&toDate=${endDate}&amount=1`
        resp = await fetch(req)
        json = await resp.json()
        console.log(json.InflationAmount, json.FromIndex.FormattedDate, json.ToIndex.FormattedDate)
    }
}