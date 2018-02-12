import * as d3 from "d3";
import { geoMercator, geoPath } from "d3-geo";
import * as colorbrewer from "colorbrewer";
import * as topojson from "topojson";
import * as moment from "moment";


function loadMap() {
  function loadBaseMap() {
    const mapLayer = svg.append("g").attr("layer", "base");
    const path = geoPath().projection(projection);

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
  const projection = geoMercator().center([-105.631120, 38.858588]).translate([width/2, height/2]).scale(width * 5);

  const issueCategoryContainer = d3.select("body")
    .append('div')
    .attr("class", "issue-categories");
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
  const categoryHeader = issueCategoryContainer
    .append("h4")
    .attr("class", "label")
    .html('Sort By Complaint Type' + '<br />');
  const categorySelector = issueCategoryContainer
    .append('select')
    .attr('class', 'select');
  const dateScale = d3.time.scale.utc();

  d3.csv('/assets/complaint_wells.csv', function(error, data) {
    if (error) throw error;
    let coordinates = [];
    let unmapped_complaints = [];
    let issue_categories =[];
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
        // When 'Issue Category' is a number, add to 'OTHER' category
        if (/\d/.test(data[i]["Issue Category"])) {
          data[i]["Issue Category"] = 'OTHER';
        }
        if (isNaN(projected[0]) || isNaN(projected[1])) {
          unmapped_complaints.push({
            date: date,
            complaint: data[i]["Issue Description"],
            issue_category: data[i]["Issue Category"]
          })
        } else {
          coordinates.push({
            x: projected[0],
            y: projected[1],
            date: date,
            complaint: data[i]["Issue Description"],
            issue_category: data[i]["Issue Category"]
          })
        }
      }
      // If issue category does not already exist add to issue categories array
      if(issue_categories.indexOf(data[i]["Issue Category"]) === -1) {
        issue_categories.push(data[i]["Issue Category"]);
        issue_categories.sort();
      }
    }
    issue_categories.push("VIEW ALL");

    dateScale.domain([minDate, maxDate])
      .interpolate(d3.interpolateHcl)
      .range(["#ffeda0", "#f03b20"]);

      showComplaints(coordinates);


      // Append select dropdown of issue categories
      categorySelector.selectAll('select')
        .data(issue_categories)
        .enter()
        .append('option')
        .text(function(d) {
          if (!/\d/.test(d)) {
            return d;
          }
        });

      // remove extra blank option
      d3.selectAll('select')[0][0].options[0].remove();

      // on click, filter mapped location to category
      d3.select(".select")
        .on("change", function(d) {
          var selectedValue = d3.select(this).property('value');
          if (selectedValue == "VIEW ALL") {
            reloadMap();
          }
          loadFilteredMap(selectedValue);
        })

      function loadFilteredMap(filter) {
        var filteredComplaints = [];
        Object.keys(coordinates).forEach(function(key) {
          if(coordinates[key].issue_category == filter) {
            filteredComplaints.push(coordinates[key])
          }
        d3.select("svg").selectAll("circle").remove();
        showComplaints(filteredComplaints);
        });
      }

      function showComplaints(coordinates) {
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
      }

      function reloadMap() {
        d3.select("svg").remove();
        d3.select(".complaints").remove();
        d3.select(".issue-categories").remove();
        loadMap();
      }

  });
}

loadMap();
