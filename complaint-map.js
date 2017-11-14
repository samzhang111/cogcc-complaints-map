
function loadMap() {
  function loadBaseMap() {
    const mapLayer = svg.append("g").attr("layer", "base");
    const path = d3.geoPath().projection(projection);

    d3.json("https://raw.githubusercontent.com/kthotav/TopoJSON-Maps/master/usa/usa-states/colorado/colorado-counties.json", function(error, colo) {
      if(error) {
        console.error(error);
      }

      mapLayer.selectAll("append")
        .data(topojson.feature(colo, colo.objects['colorado-counties']).features)
        .enter()
        .append("path")
        .attr("class", "counties")
        .attr("d", path);
    });
  }

  const width = 960, height = 500;
  const projection = d3.geo.mercator().center([-105.631120, 38.858588]).translate([width/2, height/2]).scale(width * 5);

  const svg = d3.select("body")
    .append("svg")
    .attr("width", width)
    .attr("height", height);
  const complaintsContainer = d3.select("body")
    .append("div")
    .attr("class", "complaints");
  const complaintDateContainer = complaintsContainer
    .append("div")
    .attr("class", "complaint-date");
  const complaintTextContainer = complaintsContainer
    .append("div")
    .attr("class", "complaint-text")
    .text("Highlight a node to read the complaints");

  loadBaseMap();

  const wellsLayer = svg.append("g")
    .attr("layer", "well_complaints");
  const dateScale = d3.time.scale.utc();

  d3.csv('./complaint_wells.csv', function(error, data) {
    if (error) throw error;
    let coordinates = [];
    let minDate = moment(), maxDate = moment('1/1/1800', 'M/D/YYYY');
    for (let i = 0; i < data.length; i++) {
      if (data[i].latitude && data[i].longitude) {
        let date = moment(data[i]['Receive Date'], "M/D/YYYY");

        if (date.isBefore(minDate)) {
          minDate = date;
        }

        if (date.isAfter(maxDate)) {
          maxDate = date;
        }

        const projected = projection([data[i].longitude, data[i].latitude]);

        coordinates.push({
          x: projected[0],
          y: projected[1],
          date: date,
          complaint: data[i]["Issue Description"]
        })
      }
    }

    dateScale.domain([minDate, maxDate])
      .interpolate(d3.interpolateHcl)
      .range(["#ffeda0", "#f03b20"]);

    wellsLayer.selectAll("path")
      .data(coordinates)
      .enter()
      .append("circle")
      .attr("class", "circle")
      .attr("cx", function(d) { return d.x })
      .attr("cy", function(d) { return d.y })
      .attr("r", 3)
      .attr("fill", function(d) {
        return (dateScale(d.date) || "#000")
      })
      .on("mouseover", function(d) {
        complaintDateContainer.text(d.date.calendar());
        complaintTextContainer.text(d.complaint);
      });
  });
}

loadMap();
