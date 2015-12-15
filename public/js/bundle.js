function bundle(bwidth, bheight, classes_name, classes_color, max_val_threshold){
	if(ATR.data_for_bundle){
		arrow_flag = false;

	    var w = bwidth,
	    	h = bheight,
		    rx = w / 2,
		    ry = h / 2,
		    rxzoom = w/2,
		    ryzoom = h/2,
		    m0,
		    rotate = 0,
		    pi = Math.PI
		    magic_value = 80,
		    flag_for_selection = false,
		    r = 3,
		    fe_flag = false,
		    lr_flag = false;

		splines = [];

		var fisheye = d3.fisheye.circular()
            .radius(85)
            .distortion(4);

		var zoom = d3.behavior.zoom()
		    .scaleExtent([-10, 10])
		    .on("zoom", zoomed)

		var cluster = d3.layout.cluster()
		    .size([360, ry - magic_value])
		    .sort(function(a, b) { return d3.ascending(a.key, b.key); });

		var bundle = d3.layout.bundle();

		if(ATR.tension == -1)
			ATR.tension = 0.85;

		var line = d3.svg.line.radial()
		    .interpolate("bundle")
		    .tension(ATR.tension)
		    .radius(function(d) { return d.y; })
		    .angle(function(d) { return d.x / 180 * Math.PI; });

		var svg = d3.select(".panel-body.bundle").append("svg").attr("class", "bundle").attr("id", "svg3")
		    .attr("width", w)
		    .attr("height", h)
		    .call(zoom)
		    .on("dblclick.zoom", null)
		    .on("dblclick", mousedclick)
		  	.append("g")
		  		.attr("class", "bundle-zoom")
		    	.attr("transform", "translate(" + rx + "," + ry + ")");

		var container = d3.select(".panel-body.bundle svg g");

		svg.append("path")
		    .attr("class", "arc")
		    .attr("d", d3.svg.arc().outerRadius(ry - magic_value).innerRadius(0).startAngle(0).endAngle(2 * Math.PI))
		    //.on("mousedown", mousedown);

		var nodes = cluster.nodes(packages.root(ATR.data_for_bundle)),
			links = packages.imports(nodes),
			splines = bundle(links);

		var path = svg.selectAll("path.link")
			.data(links)
			.enter()
			.append("path")
				.attr("class", function(d) { return "link source-" + d.source.key + " target-" + d.target.key; })
				.attr("d", function(d, i) { return line(splines[i]); });

		var groupData = svg.selectAll(".panel-body.bundle g.group")
			.data(nodes.filter(function(d) {
				for(i in classes_name){
					if(d.key == classes_name[i] && d.children)
						return (d.key == classes_name[i] && d.children);
				}
			}))
			.enter()
			.append("group")
				.attr("class", "group")
				.attr("id", function(d,i){
					return "g:"+d.key;
				});

		var groupArc = d3.svg.arc()
			.innerRadius(ry - (magic_value))
			.outerRadius(ry - (magic_value - 20))
			.startAngle(function(d) { return (findStartAngle(d.__data__.children)-2) * pi / 180;})
			.endAngle(function(d) { return (findEndAngle(d.__data__.children)+2) * pi / 180});

		svg.selectAll(".panel-body.bundle g.arc")
		.data(groupData[0])
		.enter()
		.append("path")
			.attr("d", groupArc)
			.attr("class", "groupArc")
			.style("fill", function(d,i){
				var id_color = classes_color[d.id.split("g:")[1]]
				if(id_color != -1)
					return ATR.colorScale(id_color);
				else
					return ATR.color4;
			})
			.on('mouseover', mouseover_debates)
        	.on('mouseout', mouseout_debates)
        	.on('click', mouseclick_debates)

		svg.selectAll(".panel-body.bundle g.node")
			.data(nodes.filter(function(n) { return !n.children; }))
			.enter()
			.append("g")
				.attr("class", "node-tweet-bundle")
				.attr("id", function(d) { return "node-" + d.key; })
				.attr("selected", false)
				.attr("manualy_selected", false)
				.attr("count", 0)
				.attr("transform", function(d) { return "rotate(" + (d.x - 90) + ")translate(" + (d.y+28) + ")"; })
					.append("circle")
					.attr("dx", function(d) { return d.x < 180 ? 28 : -28; })
					.attr("dy", ".31em")
					.attr("r", function(d){
						/*var res = get_most_probable_debate(d.twitter);
						if(res[0] == classes_color[d.name.split(".")[1]] || d.twitter.status == "non-retrieved"){
							return r;
						}else{
							return r+1;
						}*/
						return r;
					})
					.attr("stroke", function(d, i){
	                    if(Number(d.key.split("Tweet")[1]) == ATR.data_for_vis_queue_hash[ATR.labeling_request_curr])
	                        return "black";
	                    else
	                        return "white";
	                })
					.attr("selected", false)
					.attr("manualy_selected", false)
					.attr("count", 0)
					.on("mouseover", mouseover)
					.on("mouseout", mouseout)
					.on("click", mouseclick)
					.on("dblclick", mousedclick_tweet)
					.style("fill", function(d) {

						if(d.twitter.true_label == "non-retrieved"){
							return ATR.color4;
						}else{
							return ATR.colorScale(classes_color[d.twitter.true_label]);
						}

			        	/*if(classes_color[d.name.split(".")[1]] != -1){
			        			return ATR.colorScale(classes_color[d.name.split(".")[1]])
			        		}else{
			        			return ATR.color4;
			        		}*/
			        	//}
		        	})

		d3.select(".form-control.bundle-tension").on("change", function() {
			ATR.tension = this.value/100;

			nodes = cluster.nodes(packages.root(ATR.data_for_bundle)),
	        links = packages.imports(nodes),
	        splines = bundle(links);

			line.tension(ATR.tension);
			path.attr("d", function(d, i) { return line(splines[i]); });

			container.attr("transform", "translate(" + rx + "," + ry + ")");
			transform_nodes();
		});

		var node = d3.selectAll(".node-tweet-bundle");

		// getting distance of the first node to de center of the bundle to be used together with fisheyes
		var node_dist = Math.sqrt(Math.pow(d3.select(".node-tweet-bundle")[0][0].getCTM().e-rx,2) + Math.pow(d3.select(".node-tweet-bundle")[0][0].getCTM().f-ry,2));

		transform_nodes();
		function transform_nodes(){
			node.each(function(d){
				d.x = this.getCTM().e;
				d.y = this.getCTM().f;

	          	d3.select(this).attr("transform", function(d) {
	          		return "translate("+(d.x-rx)+","+(d.y-ry)+")"; 
	          	})
	          	d3.select(this).select("circle")
	              .attr("dx", function(d) { return d.x < 180 ? 28 : -28; })
			});
		}

		d3.select(".panel-body.bundle svg").on("mousemove", function() {
			if(fe_flag){
				fisheye.focus([d3.mouse($(".bundle-zoom")[0])[0]+rx, d3.mouse($(".bundle-zoom")[0])[1]+ry]);
				var point_dist = Math.sqrt(Math.pow(d3.mouse($(".bundle-zoom")[0])[0],2) + Math.pow(d3.mouse($(".bundle-zoom")[0])[1],2));

				node.each(function(d) {
						d.fisheye = fisheye(d);
					})
					.attr("transform", function(d) {
						if(point_dist >= (node_dist-5) && point_dist <= (node_dist+5))
							return "translate("+(d.fisheye.x-rx)+","+(d.fisheye.y-ry)+")";
						else
							return "translate("+(d.x-rx)+","+(d.y-ry)+")"; 
					})
					.select("circle")
				  .attr("dx", function(d) { return d.fisheye.x < 180 ? 28 : -28; })
				  .attr("r", function(d) {
				  	if(point_dist >= (node_dist-5) && point_dist <= (node_dist+5))
				  		return d.fisheye.z * 3;
				  	else
				  		return r;
				  });
			}
        });

        draw_arrow();

        function draw_arrow(){
        	if(ATR.labeling_request_curr != -1){
		        var nodeCTM = d3.select("#node-Tweet"+ATR.data_for_vis_queue_hash[ATR.labeling_request_curr])[0][0].getCTM();
				var point = [-nodeCTM.e, -nodeCTM.f];
				var norm = Math.sqrt(Math.pow(point[0],2) + Math.pow(point[1],2))
				var v_dir = [point[0]/norm, point[1]/norm]
				var new_point = [nodeCTM.e + v_dir[0], nodeCTM.f + v_dir[1]];

				d3.select("#node-Tweet"+ATR.data_for_vis_queue_hash[ATR.labeling_request_curr]).append("marker")
					.attr("id", function(d){
						return "marker_"+d.key;
					})
					.attr("viewBox", "0 0 10 10")
					.attr("refX", "0")
					.attr("refY", "5")
					.attr("markerUnits", "strokeWidth")
					.attr("markerWidth", "4")
					.attr("markerHeight", "3")
					.attr("orient", "auto")
					.style("stroke", "gray")
					.style("fill", ATR.color2)
					.style("opacity", "0.6")
					.style("z-index", 5000)
					.append("path")
						.attr("d", "M 0 0 L 10 5 L 0 10 z")

				d3.select("#node-Tweet"+ATR.data_for_vis_queue_hash[ATR.labeling_request_curr]).append("line")
					.attr("marker-end", function(d){
						return "url(#marker_"+d.key+")";
					})
					.style("stroke", "gray")
					.style("z-index", 5000)
					.attr({
						"fill": ATR.color4,
						"opacity": "0.6",
						"stroke": ATR.color4,
						"stroke-width": "4"
					})
					.attr("x2", function(d){
						return (new_point[0]-rx)*0.15;
					})
					.attr("y2", function(d){
						return (new_point[1]-ry)*0.15;
					})
					.attr("x1", function(d){
						return (new_point[0]-rx)*0.22;
					})
					.attr("y1", function(d){
						return (new_point[1]-ry)*0.22;
					})
			}
        }

		function_threshold = function(){
			nodes = cluster.nodes(packages.root(ATR.data_for_bundle)),
	        links = packages.imports(nodes),
	        splines = bundle(links);

	        path.remove();
	        path = svg.selectAll("path.link")
	        .data(links)
	        .enter()
	        .append("path")
	            .attr("class", function(d) { return "link source-" + d.source.key + " target-" + d.target.key; })
	            .attr("d", function(d, i) { return line(splines[i]); });

	        container.attr("transform", "translate(" + rx + "," + ry + ")");

	        node.each(function(d){
				d.x = this.getCTM().e;
				d.y = this.getCTM().f;
				d3.select(this).attr("selected", false);
				d3.select(this).select("circle")
					.style("opacity", 1)
			});
		}

		function zoomed(d) {
			container.attr("transform", "translate(" + ([d3.event.translate[0]+(w/2)*d3.event.scale, d3.event.translate[1]+(h/2)*d3.event.scale]) + ")scale(" + (d3.event.scale) + ")");
		}

		function clean_path(el,d,c){
			var parent = el;

			if(d3.select(el).attr("selected") == "false" || d3.select(el).attr("manualy_selected") == "false"){
				if(d3.select(el).attr("selected") == "false"){
					if(d.key.split("Tweet")[1] != ATR.data_for_vis_queue_hash[ATR.labeling_request_curr] && d3.select(el).attr("showing_labeling") != "true")
						d3.select(el).attr("stroke", "white");
					d3.select(el).attr("stroke-width", "1.5px");
				}

			  	svg.selectAll("path.link.source-" + d.key)
			      	.classed("source", false)
			      	.each(updateNodes("target", false, c, parent));

			  	svg.selectAll("path.link.target-" + d.key)
			      	.classed("target", false)
			      	.each(updateNodes("source", false, c, parent));
		    }
		}

		function highlight_path(el, d, c){
			if(c){
				d3.select(el).attr("selected", true);
				d3.select(el.parentNode).attr("selected", true);
			}

			if(d.key.split("Tweet")[1] != ATR.data_for_vis_queue_hash[ATR.labeling_request_curr] && d3.select(el).attr("showing_labeling") != "true"){
				d3.select(el).attr("stroke", "gray");
			}
			d3.select(el).attr("stroke-width", "3px");

			var parent = el;

		  	svg.selectAll("path.link.target-" + d.key)
			      .classed("target", true)
			      .each(updateNodes("source", true, c, parent));

			svg.selectAll("path.link.source-" + d.key)
			  	.classed("source", true)
			  	.each(updateNodes("target", true, c, parent));
		}

		function mousedclick(d){
			node.each(function(d,i){
				d3.select(this).attr("selected", false);
				d3.select(this).attr("manualy_selected", false);
				d3.select(this).attr("count", 0);
				d3.select(this).select("circle")
					.attr("selected", false)
					.attr("manualy_selected", false)
					.attr("count", 0)
					.style("opacity", 1)
			});
			d3.selectAll(".panel-body.bundle svg circle").each(function(d){
				clean_path(this, d, false);
			})
		}

		function mousedclick_tweet(d){
			d3.event.preventDefault();
			ATR.back_to_section2 = false;
			ATR.labeling_request_rc_flag = false;
			var idx = -1;
			var keys = Object.keys(ATR.data_for_vis_queue_hash)
			for(var i in keys){
				if(ATR.data_for_vis_queue_hash[keys[i]] == Number(d.key.split("Tweet")[1]))
					idx = Number(keys[i]);
			}
			ATR.change_labeling_request(idx);
		}

		function_fe_bundle = function(){
			fe_flag = !fe_flag;
			d3.select("#fe-bundle-button").classed("active", fe_flag)
		}

		function_lr_highlight_bundle = function(){
			lr_flag = !lr_flag;
			d3.select("#lr-bundle-button").classed("active", lr_flag)
			if(lr_flag){
				node.each(function(d,i){
					if(d.twitter.labeling){
						if(d.key.split("Tweet")[1] != ATR.data_for_vis_queue_hash[ATR.labeling_request_curr])
							d3.select(this).select("circle")
								.attr("stroke", "black")
								.attr("showing_labeling", true)
					}else{
						if(d.key.split("Tweet")[1] != ATR.data_for_vis_queue_hash[ATR.labeling_request_curr])
							d3.select(this).select("circle")
								.attr("stroke", "white")
								.attr("showing_labeling", false)
					}
				})
			}else{
				node.each(function(d,i){
					if(d.key.split("Tweet")[1] != ATR.data_for_vis_queue_hash[ATR.labeling_request_curr])
							d3.select(this).select("circle")
								.attr("stroke", "white")
								.attr("showing_labeling", false)
				})
			}
		}

		function mouseclick_debates(d,i){
			var deb_name = d3.select(d).attr("id").split("g:")[1];
            node.each(function(d){
            	var deb_name_twitter = d.name.split(".")[1];
            	if(deb_name == deb_name_twitter){
            		mouseclick(d, i, this.firstChild);
            	}
            })
		}

		function mouseclick(d,i,el){
			if(el == 0){
				el = this;
			}
			// deselect node and all conections
			if(d3.select(el).attr("selected") == "true"){
				d3.select(el.parentNode).attr("selected", false);
				d3.select(el).attr("selected", false);
				d3.select(el).style("opacity", 0.3);
				d3.select(el).attr("count", 0);
				d3.select(el.parentNode).attr("count", 0);
		    	/*d3.select(this).attr("stroke", "white");
				d3.select(this).attr("stroke-width", "1.5px");*/
				clean_path(el, d, true);
				d3.select(el.parentNode).attr("manualy_selected", false);
				d3.select(el).attr("manualy_selected", false);
			}else{
				d3.select(el.parentNode).attr("manualy_selected", true);
				d3.select(el).attr("manualy_selected", true);
				highlight_path(el, d, true);
				node.each(function(d,i){
					if(d3.select(this).attr("selected") != "true")
						d3.select(this).select("circle")
							.style("opacity", 0.3)
					else{
						d3.select(this).select("circle")
							.style("opacity", 1)
					}
				})
			}
		}

		function mouseover_debates(d){
			tooltip.select(".tooltip-inner").style("visibility", "visible")
            tooltip.select(".tooltip-inner").html("<span style='font-weight:bold'>Debate:</span> <span>" + d.id.split("g:")[1] + "</span>")
            tooltip.select(".tooltip-inner").style("top", (event.pageY-tooltip.select(".tooltip-inner").style("height").split("px")[0]-60)+"px").style("left",(event.pageX-tooltip.select(".tooltip-inner").style("width").split("px")[0]/2)+"px");
            tooltip.select(".new-tooltip").style("visibility", "visible")
            tooltip.select(".new-tooltip").style("top", (event.pageY-tooltip.select(".new-tooltip").style("height").split("px")[0]-60)+"px").style("left",(event.pageX-tooltip.select(".new-tooltip").style("width").split("px")[0]/2)+"px");

            var deb_name = d3.select(d).attr("id").split("g:")[1];
            node.each(function(d){
            	//var deb_name_twitter = d.name.split(".")[1];
            	var deb_name_twitter = d.twitter.prev_deb;
            	if(deb_name_twitter == "non-retrieved")
            		deb_name_twitter = "non_retrieved"
            	if(deb_name == deb_name_twitter){
            		highlight_path(this, d, false)
            	}
            })
		}

		function mouseout_debates(d){
			tooltip.select(".new-tooltip").style("visibility", "hidden")
            tooltip.select(".tooltip-inner").style("visibility", "hidden")

            var deb_name = d3.select(d).attr("id").split("g:")[1];
            node.each(function(d){
            	var deb_name_twitter = d.name.split(".")[1];
            	if(deb_name == deb_name_twitter){
            		clean_path(this, d, false);
            	}
            })
		}

		function mouseover(d) {
			tooltip.select(".tooltip-inner").style("visibility", "visible")
            tooltip.select(".tooltip-inner").html("<span >" + d.twitter.text + "</span><p class='twitter-info'><br /><b>— "+d.twitter.fullname+" (@"+d.twitter.username+") "+d.twitter.created_at+"</b></p>")
            tooltip.select(".tooltip-inner").style("top", (event.pageY-tooltip.select(".tooltip-inner").style("height").split("px")[0]-60)+"px").style("left",(event.pageX-tooltip.select(".tooltip-inner").style("width").split("px")[0]/2)+"px");
            tooltip.select(".new-tooltip").style("visibility", "visible")
            tooltip.select(".new-tooltip").style("top", (event.pageY-tooltip.select(".new-tooltip").style("height").split("px")[0]-60)+"px").style("left",(event.pageX-tooltip.select(".new-tooltip").style("width").split("px")[0]/2)+"px");

			highlight_path(this, d, false)
		}

		function mouseout(d) {
			tooltip.select(".new-tooltip").style("visibility", "hidden")
            tooltip.select(".tooltip-inner").style("visibility", "hidden")

			clean_path(this, d, false);
		}

		function updateNodes(name, value, c, p) {
		  return function(d) {
		    if (value) {
		    	this.parentNode.appendChild(this);
		    	if(c){
		    		d3.select(p.parentNode).attr("count", function(d){
						return Number(d3.select(this).attr("count"))+1;
					});
					d3.select(p).attr("count", function(d){
						return Number(d3.select(this).attr("count"))+1;
					});
		    		svg.select("#node-"+d[name].key).attr("count", function(d){
						return Number(d3.select(this).attr("count"))+1;
					});
					svg.select("#node-"+d[name].key).select("circle").attr("count", function(d){
						return Number(d3.select(this).attr("count"))+1;
					});
		    		svg.select("#node-"+d[name].key).attr("selected", true)
		    		svg.select("#node-"+d[name].key).select("circle").attr("selected", true)
		    		svg.select("#node-"+d[name].key).select("circle").style("opacity", 1)
		    		if(d[name].key.split("Tweet")[1] != ATR.data_for_vis_queue_hash[ATR.labeling_request_curr] && svg.select("#node-"+d[name].key).select("circle").attr("showing_labeling") != "true"){
		    			svg.select("#node-"+d[name].key).select("circle").attr("stroke", "gray");
		    		}
					svg.select("#node-"+d[name].key).select("circle").attr("stroke-width", "3px");
		    	}
		    }else{
		    	if(c){
		    		if(d3.select(p).attr("manualy_selected") == "true"){
			    		svg.select("#node-"+d[name].key).attr("count", function(d){
							return Number(d3.select(this).attr("count"))-1;
						});
						svg.select("#node-"+d[name].key).select("circle").attr("count", function(d){
							return Number(d3.select(this).attr("count"))-1;
						});
						if(Number(svg.select("#node-"+d[name].key).attr("count")) == 0){
			    			svg.select("#node-"+d[name].key).attr("selected", false)
				    		svg.select("#node-"+d[name].key).select("circle").attr("selected", false)
				    		svg.select("#node-"+d[name].key).select("circle").style("opacity", 0.3)
				    		if(d[name].key.split("Tweet")[1] != ATR.data_for_vis_queue_hash[ATR.labeling_request_curr] && svg.select("#node-"+d[name].key).select("circle").attr("showing_labeling") != "true"){
				    			svg.select("#node-"+d[name].key).select("circle").attr("stroke", "white");
				    		}
							svg.select("#node-"+d[name].key).select("circle").attr("stroke-width", "1.5px");
						}
					}
		    	}
		    }
		    svg.select("#node-" + d[name].key).classed(name, value);
		  };
		}

		function findStartAngle(children) {
		    var min = children[0].x;
		    children.forEach(function(d) {
		       if (d.x < min)
		           min = d.x;
		    });
		    return min;
		}

		function findEndAngle(children) {
		    var max = children[0].x;
		    children.forEach(function(d) {
		       if (d.x > max)
		           max = d.x;
		    });
		    return max;
		}
	}
}