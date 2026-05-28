const state = {
  scenario: "ssp585",
  year: 2100,
  selectedCountry: "United States of America",
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
  .domain([0, 1, 2, 3, 5, 7, 8, 9, 12])
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

  .translateExtent([
    [-200, -100],
    [widthMap + 200, heightMap + 200]
  ])

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

  d3.select("#resetZoom").on("click", () => {
  svgMap.transition()
    .duration(500)
    .call(zoom.transform, d3.zoomIdentity);
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

  const steps = document.querySelectorAll(".step");
  const visualText = document.querySelector("#scrollyVisualText");
  const visual = document.querySelector("#scrollyVisual");
  const visualImg = document.querySelector("#scrollyVisualImg");

  const stepObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      steps.forEach(s => s.classList.remove("active"));
      entry.target.classList.add("active");

      const step = entry.target.dataset.step;

      if (step === "1") {
        visualText.textContent = "2020 warming map";

        visualImg.style.opacity = 0;

        setTimeout(() => {
          visualImg.src = "images/story-2020.png";
          visualImg.style.opacity = 1;
        }, 180);

        visual.classList.remove("mini-map-placeholder", "mini-map-hot");
        visual.classList.add("mini-map-placeholder");
        setStoryState("ssp126", 2020);
      }

      if (step === "2") {
        visualText.textContent = "2100 SSP5-8.5 warming";

        visualImg.style.opacity = 0;

        setTimeout(() => {
          visualImg.src = "images/story-2100-high.png";
          visualImg.style.opacity = 1;
        }, 180);

        visual.classList.remove("mini-map-placeholder", "mini-map-hot");
        visual.classList.add("mini-map-hot");
        setStoryState("ssp585", 2100);
      }

      if (step === "3") {
        visualText.textContent = "SSP1-2.6 vs SSP5-8.5";

        visualImg.style.opacity = 0;

        setTimeout(() => {
          visualImg.src = "images/story-compare.png";
          visualImg.style.opacity = 1;
        }, 180);

        visual.classList.remove("mini-map-placeholder", "mini-map-hot");
        visual.classList.add("mini-map-placeholder");
        setStoryState("ssp126", 2100);
      }

      if (step === "4") {
        visualText.textContent = "Explore the dashboard";

        visualImg.style.opacity = 0;

        setTimeout(() => {
          visualImg.src = "images/dashboard.png";
          visualImg.style.opacity = 1;
        }, 180);

        setStoryState("ssp585", 2100);
      }
    });
  }, { threshold: 0.6 });

  steps.forEach(step => stepObserver.observe(step));
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

function setStoryState(scenario, year) {
  state.scenario = scenario;
  state.year = year;

  d3.select("#scenarioSelect").property("value", scenario);
  d3.select("#yearSlider").property("value", year);
  d3.select("#yearValue").text(year);
  d3.select("#mapYearTitle").text(year);

  drawMap();
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

      if (!getCountryData(name)) return;

      if (state.selectedCountry === name) {
        state.selectedCountry = "United States of America";

        mapLayer.selectAll(".country")
          .classed("selected", false);

        updateDetail();
        drawLineChart();
        return;
      }

      state.selectedCountry = name;

      mapLayer.selectAll(".country")
        .classed("selected", false);

      d3.select(event.currentTarget)
        .classed("selected", true);

      updateDetail();
      drawLineChart();
    });
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

  const margin = { top: 35, right: 22, bottom: 32, left: 42 };
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

    g.append("path")
  .datum(data)
  .attr("class", "line-high")
  .attr("d", lineHigh);

const focus = g.append("g")
  .style("display", "none");

focus.append("line")
  .attr("class", "hover-line")
  .attr("y1", 0)
  .attr("y2", innerH);

focus.append("circle")
  .attr("class", "hover-dot-low")
  .attr("r", 5);

focus.append("circle")
  .attr("class", "hover-dot-high")
  .attr("r", 5);

focus.append("rect")
  .attr("class", "hover-label-bg")
  .attr("rx", 10)
  .attr("ry", 10);

focus.append("text")
  .attr("class", "hover-text")
  .attr("x", innerW / 2)
  .attr("y", -17)
  .attr("text-anchor", "middle");

const bisectYear = d3.bisector(d => d.year).left;

g.append("rect")
  .attr("width", innerW)
  .attr("height", innerH)
  .attr("fill", "transparent")
  .on("mouseenter", () => focus.style("display", null))
  .on("mouseleave", () => focus.style("display", "none"))
  .on("mousemove", (event) => {
    const [mx] = d3.pointer(event);
    const year = x.invert(mx);
    let i = bisectYear(data, year);

    if (i >= data.length) i = data.length - 1;
    if (i > 0) {
      const left = data[i - 1];
      const right = data[i];

      i = (year - left.year < right.year - year) ? i - 1 : i;
    }

    const d = data[i];

    focus.select(".hover-line")
      .attr("x1", x(d.year))
      .attr("x2", x(d.year));

    focus.select(".hover-dot-low")
      .attr("cx", x(d.year))
      .attr("cy", y(d.ssp126));

    focus.select(".hover-dot-high")
      .attr("cx", x(d.year))
      .attr("cy", y(d.ssp585));

    const text = `${d.year}: \u00A0\u00A0SSP1-2.6 +${d.ssp126.toFixed(1)}°C \u00A0\u00A0|\u00A0\u00A0 SSP5-8.5 +${d.ssp585.toFixed(1)}°C`;

    focus.select(".hover-text")
      .attr("x", innerW / 2)
      .attr("y", -17)
      .attr("text-anchor", "middle")
      .text(text);

    const bbox = focus.select(".hover-text").node().getBBox();

    focus.select(".hover-label-bg")
      .attr("x", bbox.x - 12)
      .attr("y", bbox.y - 6)
      .attr("width", bbox.width + 24)
      .attr("height", bbox.height + 12);
  });

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

window.addEventListener("scroll", () => {
  const nav = document.querySelector(".top-nav");

  if (window.scrollY > 80) {
    nav.classList.add("visible");
  } else {
    nav.classList.remove("visible");
  }
});
