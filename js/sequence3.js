// Dimensions of sunburst.
var width = 900;
var height = 800;
var radius = Math.min(width, height) / 2;

// Breadcrumb dimensions: width, height, spacing, width of tip/tail.
var b = {
  w: 75, h: 30, s: 3, t: 10
};

// Mapping of step names to colors.
var colors = {  
  "0.1 (a)" 	: "#ebc11d", 
  "0.25 (a)"	: "#ebc11d", 
  "0.50 (a)" 	: "#ebc11d", 
  "1 (a)" 		: "#ebc11d", 
  "1.5 (a)" 	: "#ebc11d",
  
  "0.1 (b)" 	: "#24a0db", 
  "0.25 (b)"	: "#24a0db", 
  "0.50 (b)" 	: "#24a0db", 
  "1 (b)" 		: "#24a0db", 
  "1.5 (b)" 	: "#24a0db",
  
  "0.1 (f)" 	: "#e68037", 
  "0.25 (f)"	: "#e68037", 
  "0.50 (f)" 	: "#e68037", 
  "1 (f)" 		: "#e68037", 
  "1.5 (f)" 	: "#e68037",
  
  "0.1 (d)" 	: "#8d4d9e", 
  "0.25 (d)"	: "#8d4d9e", 
  "0.50 (d)" 	: "#8d4d9e", 
  "1 (d)" 		: "#8d4d9e", 
  "1.5 (d)" 	: "#8d4d9e",
  
   "100% Stocks (a)" : "#ebc11d",
  "75% Stocks (a)" : "#ebc11d", 
  "50% Stocks (a)" : "#ebc11d",
  "25% Stocks (a)" : "#ebc11d",
  "100% Bonds (a)" : "#ebc11d",
  "100% Stocks (b)" : "#24a0db",
  "75% Stocks (b)" : "#24a0db", 
  "50% Stocks (b)" : "#24a0db",
  "25% Stocks (b)" : "#24a0db",
  "100% Bonds (b)" : "#24a0db",
  "100% Stocks (f)" : "#e68037",
  "75% Stocks (f)" : "#e68037", 
  "50% Stocks (f)" : "#e68037",
  "25% Stocks (f)" : "#e68037",
  "100% Bonds (f)" : "#e68037",
  "100% Stocks (d)" : "#8d4d9e",
  "75% Stocks (d)" : "#8d4d9e", 
  "50% Stocks (d)" : "#8d4d9e",
  "25% Stocks (d)" : "#8d4d9e",
  "100% Bonds (d)" : "#8d4d9e",
  "10 Years" : "#ebc11d",
  "15 Years" : "#24a0db",
  "20 Years" : "#e68037",
  "30 Years" : "#8d4d9e",
};

// Total size of all segments; we set this later, after loading the data.
var totalSize = 0; 

var vis = d3.select("#chart").append("svg:svg")
    .attr("width", width)
    .attr("height", height)
    .append("svg:g")
    .attr("id", "container")
    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

var partition = d3.layout.partition()
    .size([2 * Math.PI, radius * radius])
    .value(function(d) { return d.size; });

var arc = d3.svg.arc()
    .startAngle(function(d) { return d.x; })
    .endAngle(function(d) { return d.x + d.dx; })
    .innerRadius(function(d) { return Math.sqrt(d.y); })
    .outerRadius(function(d) { return Math.sqrt(d.y + d.dy); });

// Use d3.text and d3.csv.parseRows so that we do not need to have a header
// row, and can receive the csv as an array of arrays.
d3.text("data/visit-sequences3.csv", function(text) {
  var csv = d3.csv.parseRows(text);
  var json = buildHierarchy(csv);
  createVisualization(json);
});

// Main function to draw and set up the visualization, once we have the data.
function createVisualization(json) {

  // Basic setup of page elements.
  initializeBreadcrumbTrail();
  drawLegend();
  d3.select("#togglelegend").on("click", toggleLegend);

  // Bounding circle underneath the sunburst, to make it easier to detect
  // when the mouse leaves the parent g.
  vis.append("svg:circle")
      .attr("r", radius)
      .style("opacity", 0);

  // For efficiency, filter nodes to keep only those large enough to see.
  var nodes = partition.nodes(json)
      .filter(function(d) {
      return (d.dx > 0.009); // 0.005 radians = 0.29 degrees
      }); 
 
	var path = vis.data([json]).selectAll("path")
	  .data(partition.nodes)
	  .enter().append("g")
	
	path.append("path")
	  .attr("display", function(d) { return d.depth ? null : "none"; }) // hide inner ring
	  .attr("d", arc)
	  .style("stroke", "#fff")
	  .attr("class", "strokeStyle")
	  .style("fill", function(d) { return colors[(d.children ? d : d.parent).name]; })
	  .style("fill-rule", "evenodd")
	  .on("mouseover", mouseover)
	  .each(stash);
	  
	path.append("text")
		.text(function(d) {return d.name})
		.classed("label", true)
		.attr("x", function(d) { return d.x; })
		.attr("text-anchor", "middle")
		// translate to the desired point and set the rotation
		.attr("transform", function(d) {
			if (d.depth > 0) {
				return "translate(" + arc.centroid(d) + ")" +
					   "rotate(" + getAngle(d) + ")";
			}  else {
				return null;
			}
		})
		.attr("dx", "0") // margin
		.attr("dy", ".35em") // vertical-align
		.attr("pointer-events", "none");
	 
  // Add the mouseleave handler to the bounding circle.
  d3.select("#container").on("mouseleave", mouseleave);

  // Get total size of the tree = value of root node from partition.
  totalSize = path.node().__data__.value;
  };

 function getAngle(d) {
    var thetaDeg = (180 / Math.PI * (arc.startAngle()(d) + arc.endAngle()(d)) / 2 - 90);
    return (thetaDeg > 90) ? thetaDeg - 180 : thetaDeg;
}

// Stash the old values for transition.
function stash(d) {
  d.x0 = d.x;
  d.dx0 = d.dx;
}

// Interpolate the arcs in data space.
function arcTween(a) {
  var i = d3.interpolate({x: a.x0, dx: a.dx0}, a);
  return function(t) {
    var b = i(t);
    a.x0 = b.x;
    a.dx0 = b.dx;
    return arc(b);
  };
}

// Fade all but the current sequence, and show it in the breadcrumb trail.
function mouseover(d) {

    var path = 'images/'; // default path here
	
	var dValue = $(d).attr('name');
	var anc = getAncestors(d);
	var result = $(anc[1]).attr('name');
	
	
	var allocValue = $(anc[1]).attr('name');
	var yearsValue = $(anc[0]).attr('name');
	var expValue = $(anc[2]).attr('name');	
	
//	alert(dValue+'-'+allocValue);
	
	changeImgNew(dValue, allocValue, d);

//	changeImgFunction(pass1, pass2, pass3, pass4); 
	
  d3.select("#explanation")
      .style("visibility", "");

  var sequenceArray = getAncestors(d);
//  updateBreadcrumbs(sequenceArray, percentageString);

  // Fade all the segments.
  d3.selectAll("path")
      .style("opacity", 0.3);

  // Then highlight only those that are an ancestor of the current segment.
  vis.selectAll("path")
      .filter(function(node) {
                return (sequenceArray.indexOf(node) >= 0);
              })
      .style("opacity", 1);
	  
}
// file name comes as 0.1 (a)-100% Stocks (a)
function changeImgNew(fileName, allocValue, d) {
	var a = fileName.split('(');
	var bar = allocValue.split('(');
	var c = bar[0].split('%');

	var dValue = $(d).attr('name');
	var anc = getAncestors(d);
	var result = $(anc[1]).attr('name'); 
    	
	if (result == "100% Stocks (a)" || result == "50% Stocks (a)" || result == "75% Stocks (a)" || result == "25% Stocks (a)" || result == "100% Bonds (a)") {
		if (result == "100% Bonds (a)") {
			$("#changeImage").attr('src', 'images/'+$.trim(a[0])+'-'+c[0]+'b.png');
			if ($.trim(a[0]) == "100% Bonds") {
				$("#changeImage").attr('src', 'images/blank.png');
			}
		} else if ($.trim(a[0]) == "100% Stocks" || $.trim(a[0]) == "75% Stocks" || $.trim(a[0]) == "50% Stocks" || $.trim(a[0]) == "25% Stocks" || $.trim(a[0]) == "100% Bonds") {
			$("#changeImage").attr('src', 'images/blank.png');
		} else {
			$("#changeImage").attr('src', 'images/'+$.trim(a[0])+'-'+c[0]+'.png');
		}
	} else if (result == "100% Stocks (f)" || result == "50% Stocks (f)" || result == "75% Stocks (f)" || result == "25% Stocks (f)" || result == "100% Bonds (f)" ) {
		if (result == "100% Bonds (f)") {
			$("#changeImage").attr('src', 'images/f'+$.trim(a[0])+'-'+c[0]+'b.png');
			if ($.trim(a[0]) == "100% Bonds") {
				$("#changeImage").attr('src', 'images/blank.png');
			}
		} else if ($.trim(a[0]) == "100% Stocks" || $.trim(a[0]) == "75% Stocks" || $.trim(a[0]) == "50% Stocks" || $.trim(a[0]) == "25% Stocks" || $.trim(a[0]) == "100% Bonds") {
			$("#changeImage").attr('src', 'images/blank.png');
		} else {
			$("#changeImage").attr('src', 'images/f'+$.trim(a[0])+'-'+c[0]+'.png');
		}
	} else if (result == "100% Stocks (d)" || result == "50% Stocks (d)" || result == "75% Stocks (d)" || result == "25% Stocks (d)" || result == "100% Bonds (d)" ) {
		 if (result == "100% Bonds (d)") {
			$("#changeImage").attr('src', 'images/d'+$.trim(a[0])+'-'+c[0]+'b.png');
			if ($.trim(a[0]) == "100% Bonds") {
				$("#changeImage").attr('src', 'images/blank.png');
			}
		} else if ($.trim(a[0]) == "100% Stocks" || $.trim(a[0]) == "75% Stocks" || $.trim(a[0]) == "50% Stocks" || $.trim(a[0]) == "25% Stocks" || $.trim(a[0]) == "100% Bonds") {
			$("#changeImage").attr('src', 'images/blank.png');
		} else {
			$("#changeImage").attr('src', 'images/d'+$.trim(a[0])+'-'+c[0]+'.png');
		} 
	} else {
		
	}

//$("#changeImage").attr('src', 'images/'+  +'-'+  +'b.png');

// alert(percent);

/*
	if ($.trim(a[0]) == "100% Stocks" || $.trim(a[0]) == "75% Stocks" || $.trim(a[0]) == "50% Stocks" || $.trim(a[0]) == "25% Stocks") {
		$("#changeImage").attr('src', 'images/blank.png');
	} else if (fileName == "0.1 (a).b" || fileName == "0.5 (a).b" || fileName == "1 (a).b" || fileName == "1.5 (a).b"  || fileName == "2 (a).b" ) { 
		$("#changeImage").attr('src', 'images/'+$.trim(a[0])+'-'+c[0]+'b.png');
	} else {
		$("#changeImage").attr('src', 'images/'+$.trim(a[0])+'-'+c[0]+'.png');
	}
	*/
}
  
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
} 

// Restore everything to full opacity when moving off the visualization.
function mouseleave(d) {

  // Hide the breadcrumb trail
  d3.select("#trail")
      .style("visibility", "hidden");

  // Deactivate all segments during transition.
  d3.selectAll("path").on("mouseover", null);

  // Transition each segment to full opacity and then reactivate it.
  d3.selectAll("path")
      .transition()
      .duration(1000)
      .style("opacity", 1)
      .each("end", function() {
              d3.select(this).on("mouseover", mouseover);
            });

  d3.select("#explanation")
      .style("visibility", "hidden");
}

// Given a node in a partition layout, return an array of all of its ancestor
// nodes, highest first, but excluding the root.
function getAncestors(node) {
  var path = [];
  var current = node;
  while (current.parent) {
    path.unshift(current);
    current = current.parent;
  }
  return path;
}

function initializeBreadcrumbTrail() {
  // Add the svg area.
  var trail = d3.select("#sequence").append("svg:svg")
      .attr("width", width)
      .attr("height", 50)
      .attr("id", "trail");
  // Add the label at the end, for the percentage.
  trail.append("svg:text")
    .attr("id", "endlabel")
    .style("fill", "#000");
}

// Generate a string that describes the points of a breadcrumb polygon.
function breadcrumbPoints(d, i) {
  var points = [];
  points.push("0,0");
  points.push(b.w + ",0");
  points.push(b.w + b.t + "," + (b.h / 2));
  points.push(b.w + "," + b.h);
  points.push("0," + b.h);
  if (i > 0) { // Leftmost breadcrumb; don't include 6th vertex.
    points.push(b.t + "," + (b.h / 2));
  }
  return points.join(" ");
}

// Update the breadcrumb trail to show the current sequence and percentage.
function updateBreadcrumbs(nodeArray, percentageString) {

  // Data join; key function combines name and depth (= position in sequence).
  var g = d3.select("#trail")
      .selectAll("g")
      .data(nodeArray, function(d) { return d.name + d.depth; });

  // Add breadcrumb and label for entering nodes.
  var entering = g.enter().append("svg:g");

  entering.append("svg:polygon")
      .attr("points", breadcrumbPoints)
      .style("fill", function(d) { return colors[d.name]; });

  entering.append("svg:text")
      .attr("x", (b.w + b.t) / 2)
      .attr("y", b.h / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(function(d) { return d.name; });

  // Set position for entering and updating nodes.
  g.attr("transform", function(d, i) {
    return "translate(" + i * (b.w + b.s) + ", 0)";
  });

  // Remove exiting nodes.
  g.exit().remove();

  // Now move and update the percentage at the end.
  d3.select("#trail").select("#endlabel")
      .attr("x", (nodeArray.length + 0.5) * (b.w + b.s))
      .attr("y", b.h / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(percentageString);

  // Make the breadcrumb trail visible, if it's hidden.
 // d3.select("#trail").style("visibility", "");

}

function drawLegend() {

  // Dimensions of legend item: width, height, spacing, radius of rounded rect.
  var li = {
    w: 150, h: 30, s: 3, r: 3
  };

  var legend = d3.select("#legend").append("svg:svg")
      .attr("width", li.w)
      .attr("height", d3.keys(colors).length * (li.h + li.s));

  var g = legend.selectAll("g")
      .data(d3.entries(colors))
      .enter().append("svg:g")
      .attr("transform", function(d, i) {
              return "translate(0," + i * (li.h + li.s) + ")";
           });

  g.append("svg:rect")
      .attr("rx", li.r)
      .attr("ry", li.r)
      .attr("width", li.w)
      .attr("height", li.h)
      .style("fill", function(d) { return d.value; });

  g.append("svg:text")
      .attr("x", li.w / 2)
      .attr("y", li.h / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(function(d) { return d.key; });
}

function toggleLegend() {
  var legend = d3.select("#legend");
  if (legend.style("visibility") == "hidden") {
    legend.style("visibility", "");
  } else {
    legend.style("visibility", "hidden");
  }
}

// Take a 2-column CSV and transform it into a hierarchical structure suitable
// for a partition layout. The first column is a sequence of step names, from
// root to leaf, separated by hyphens. The second column is a count of how 
// often that sequence occurred.
function buildHierarchy(csv) {
  var root = {"name": "root", "children": []};
  for (var i = 0; i < csv.length; i++) {
    var sequence = csv[i][0];
    var size = +csv[i][1];
    if (isNaN(size)) { // e.g. if this is a header row
      continue;
    }
	
    var parts = sequence.split("-");
    var currentNode = root;
    for (var j = 0; j < parts.length; j++) {
      var children = currentNode["children"];
      var nodeName = parts[j];
      var childNode;
      if (j + 1 < parts.length) {
   // Not yet at the end of the sequence; move down the tree.
 	var foundChild = false;
 	for (var k = 0; k < children.length; k++) {
 	  if (children[k]["name"] == nodeName) {
 	    childNode = children[k];
 	    foundChild = true;
 	    break;
 	  }
 	}
	
  // If we don't already have a child node for this branch, create it.
 	if (!foundChild) {
 	  childNode = {"name": nodeName, "children": []};
 	  children.push(childNode);
 	}
 	currentNode = childNode;
      } else {
 	// Reached the end of the sequence; create a leaf node.
 	childNode = {"name": nodeName, "size": size};
 	children.push(childNode);
      }
    }
  }
  return root;
};