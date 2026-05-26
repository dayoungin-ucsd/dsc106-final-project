const state = {
  scenario: "ssp585",
  year: 2100,
  selectedCountry: "United States",
  data: null,
  geo: null
};

const countryNameFix = new Map([
  ["Russian Federation", "Russia"]
]);

const scenarioKey = {
  ssp126: "ssp126_2100",
  ssp585: "ssp585_2100"
};

const colorScale = d3.scaleLinear()
  .domain([0, 1, 2, 3, 4, 5, 6, 7, 8])
  .range([
    "#dceefb",
    "#b6dff6",
    "#fff7bc",
    "#fee391",
    "#fdc574",
    "#fb8d3c",
    "#f03b20",
    "#d7301f",
    "#99000d"
  ])
  .clamp(true);

const svgMap = d3.select("#worldMap");
const svgLine = d3.select("#lineChart");
const tooltip = d3.select("#tooltip");

const widthMap = 720;
const heightMap = 330;

const projection = d3.geoNaturalEarth1()
  .scale(155)
  .translate([widthMap / 2, heightMap / 2 + 55]);

const path = d3.geoPath(projection);

const mapLayer = svgMap.append("g");

const zoom = d3.zoom()
  .scaleExtent([1, 6])
  .on("zoom", (event) => {
    mapLayer.attr("transform", event.transform);
  });

svgMap.call(zoom);

Promise.all([
  d3.json("data.json"),
  d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json")
]).then(([data, world]) => {
  state.data = data;
  state.geo = topojson.feature(world, world.objects.countries).features;

  svgMap.attr("viewBox", `0 0 ${widthMap} ${heightMap}`);
  drawMap();
  updateDetail();
  drawLineChart();

  d3.select("#scenarioSelect").on("change", (event) => {
    state.scenario = event.target.value;
    drawMap();
    updateDetail();
  });

  d3.select("#yearSlider").on("input", (event) => {
    state.year = +event.target.value;
    d3.select("#yearValue").text(state.year);
    d3.select("#mapYearTitle").text(state.year);
    drawMap();
  });

  d3.select("#clearSelection").on("click", () => {
    state.selectedCountry = "United States";
    updateDetail();
    drawLineChart();
  });

  d3.select("#zoomOut").on("click", () => {
    svgMap.transition()
      .duration(300)
      .call(zoom.scaleBy, 0.8);
  });

  d3.select("#zoomIn").on("click", () => {
    svgMap.transition()
      .duration(300)
      .call(zoom.scaleBy, 1.25);
  });

  let playing = false;
  let playTimer = null;

  d3.select("#playYear").on("click", () => {
    playing = !playing;

    d3.select("#playYear").text(playing ? "⏸" : "▶");

    if (playing) {
      playTimer = setInterval(() => {
        state.year += 10;

        if (state.year > 2100) {
          state.year = 2020;
        }

        d3.select("#yearSlider").property("value", state.year);
        d3.select("#yearValue").text(state.year);
        d3.select("#mapYearTitle").text(state.year);

        drawMap();
      }, 700);
    } else {
      clearInterval(playTimer);
    }
  });
});

function getCountryData(name) {
  const fixedName = countryNameFix.get(name) || name;

  const countries = Array.isArray(state.data.countries)
    ? state.data.countries
    : Object.values(state.data.countries);

  return countries.find(d => d.name === fixedName);
}

function getProjectedValue(country, scenario, year) {
  if (!country) return null;

  const current = country.current;
  const target = country[scenarioKey[scenario]];
  const t = Math.max(0, (year - 2020) / 80);
  return current + t * (target - current);
}

function drawMap() {
  mapLayer.selectAll("*").remove();

  mapLayer.append("rect")
    .attr("width", widthMap)
    .attr("height", heightMap)
    .attr("fill", "transparent");

  mapLayer.selectAll("path")
    .data(state.geo)
    .join("path")
    .attr("class", "country")
    .attr("d", path)
    .attr("fill", d => {
      const name = d.properties.name;
      const datum = getCountryData(name);
      const value = getProjectedValue(datum, state.scenario, state.year);

      if (value == null) {
        const centroid = path.centroid(d);
        const latLike = Math.abs(projection.invert(centroid)?.[1] || 0);
        return colorScale(Math.max(0.8, 2.2 + latLike / 18));
      }

      return colorScale(value);
    })
    .on("mousemove", (event, d) => {
      const name = countryNameFix.get(d.properties.name) || d.properties.name;
      const datum = getCountryData(d.properties.name);
      const value = getProjectedValue(datum, state.scenario, state.year);

      tooltip
        .classed("hidden", false)
        .style("left", `${event.offsetX + 16}px`)
        .style("top", `${event.offsetY - 12}px`)
        .html(`
          <strong>${name}</strong>
          <span class="value">${value == null ? "N/A" : "+" + value.toFixed(1) + "°C"}</span>
          <small>${state.scenario.toUpperCase()} in ${state.year}</small>
        `);
    })
    .on("mouseleave", () => tooltip.classed("hidden", true))
    .on("click", (event, d) => {
      const name = countryNameFix.get(d.properties.name) || d.properties.name;
      if (getCountryData(name)) {
        state.selectedCountry = name;
        updateDetail();
        drawLineChart();
      }
    });

  // svgMap.append("text")
  //   .attr("x", widthMap - 58)
  //   .attr("y", heightMap - 72)
  //   .attr("font-size", 22)
  //   .attr("font-weight", 900)
  //   .attr("fill", "#0f1e35")
  //   .text("+");

  // svgMap.append("text")
  //   .attr("x", widthMap - 55)
  //   .attr("y", heightMap - 42)
  //   .attr("font-size", 26)
  //   .attr("font-weight", 900)
  //   .attr("fill", "#0f1e35")
  //   .text("−");
}

function updateDetail() {
  const countries = Array.isArray(state.data.countries)
    ? state.data.countries
    : Object.values(state.data.countries);

  const country =
    countries.find(d => d.name === state.selectedCountry) || countries[0];

  d3.select("#countryFlag").text(country.flag);
  d3.select("#countryName").text(country.name);
  d3.select("#lowStat").text(`+${country.ssp126_2100.toFixed(1)}°C`);
  d3.select("#highStat").text(`+${country.ssp585_2100.toFixed(1)}°C`);
  d3.select("#currentStat").text(`+${country.current.toFixed(1)}°C`);
  d3.select("#rankStat").text(`${country.rank} / 195`);
}

function drawLineChart() {
  const countries = Array.isArray(state.data.countries)
    ? state.data.countries
    : Object.values(state.data.countries);

  const country =
    countries.find(d => d.name === state.selectedCountry) || countries[0];
  const data = country.series;

  const margin = { top: 16, right: 22, bottom: 32, left: 42 };
  const width = 610;
  const height = 190;
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  svgLine.selectAll("*").remove();
  svgLine.attr("viewBox", `0 0 ${width} ${height}`);

  const g = svgLine.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain(d3.extent(data, d => d.year))
    .range([0, innerW]);

  const y = d3.scaleLinear()
    .domain([-1, d3.max(data, d => Math.max(d.ssp126, d.ssp585)) + 0.6])
    .nice()
    .range([innerH, 0]);

  g.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).tickSize(-innerW).tickFormat(""))
    .select(".domain").remove();

  g.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(6));

  g.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).ticks(5));

  const lineLow = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.ssp126))
    .curve(d3.curveMonotoneX);

  const lineHigh = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.ssp585))
    .curve(d3.curveMonotoneX);

  g.append("path")
    .datum(data)
    .attr("class", "line-low")
    .attr("d", lineLow);

  g.append("path")
    .datum(data)
    .attr("class", "line-high")
    .attr("d", lineHigh);

  g.append("line")
    .attr("x1", x(2020))
    .attr("x2", x(2020))
    .attr("y1", 0)
    .attr("y2", innerH)
    .attr("stroke", "#94a3b8")
    .attr("stroke-dasharray", "4 4");

  g.append("text")
    .attr("x", x(2020) + 8)
    .attr("y", 18)
    .attr("fill", "#64748b")
    .attr("font-size", 11)
    .text("Future Projections →");
}
