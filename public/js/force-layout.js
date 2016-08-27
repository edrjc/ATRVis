function force_layout(bwidth, bheight){
	if(ATR.data_for_force_layout){

		var margin = {top: 40, right: 20, bottom: 50, left: 40},
        width = bwidth - margin.left - margin.right,
        height = bheight - margin.top - margin.bottom
        iter = 100,
        ATR.fe_flag = false,
        pos_transl = [0,0],
        pos_scale = 1;

        var zoom = d3.behavior.zoom()
		    .scaleExtent([-10, 10])
		    .on("zoom", zoomed);

		var drag = d3.behavior.drag()
			.origin(function(d) { return d; })
			.on("dragstart", dragstarted)
			.on("drag", dragged)
    		.on("dragend", dragended);

        var fisheye = d3.fisheye.circular()
            .radius(85)
            .distortion(4);

        force = d3.layout.force()
        	.charge(-20) //-50
        	.linkDistance(40) //40
        	.size([width, height]);

        var svg = d3.select(".panel-body.force-layout").append("svg").attr("class", "force-layout").attr("id", "svg2")
        	.attr("width", width + margin.left + margin.right)
        	.attr("height", height + margin.top + margin.bottom)
        	.call(zoom)
            .on("dblclick.zoom", null)
            .on('dblclick', mousedclick)

        force
        	.nodes(ATR.data_for_force_layout.nodes)
        	.links(ATR.data_for_force_layout.links)
        	.start();

        var container = svg.append("g");

        container.append("g")
    		.attr("class", "links-fl")
    		.selectAll(".link-fl")
        	.data(ATR.data_for_force_layout.links)
        	.enter().append("line")
            .attr("class", function(d) { return "link-fl source-" + d.source.index + " target-" + d.target.index })
        	.style("stroke-width", function(d) { return Math.sqrt(d.value); });

        container.append("g")
        	.attr("class", "nodes-fl")
        	.selectAll(".node-fl")
        	.data(ATR.data_for_force_layout.nodes)
        	.enter().append("g").attr("id", function(d) { return "nodeg-" + d.index; }).append("circle")
            	.attr("class", "node-fl")
                .attr("id", function(d) { return "node-" + d.index; })
            	.attr("r", 5)
                .attr("stroke", function(d, i){
                    if(d.index == ATR.data_for_vis_queue_hash2[String(ATR.labeling_request_curr)])
                        return "black";
                    else
                        return "white";
                })
                .attr("stroke-width", "1.5px")
                .attr("selected", false)
                .attr("manualy_selected", false)
                .attr("count", 0)
            	.style("fill", function(d,i) {
            		if(d.debate_number != -1){
            			return ATR.colorScale(d.debate_number)
            		}else{
            			return ATR.color4;
            		}
            	})
            	.on('mouseover', mouseover)
            	.on('mouseout', mouseout)
                .on('click', mouseclick)
                .on("dblclick", mousedclick_tweet)
            	.call(drag);

        var link = d3.selectAll(".link-fl");
        var node = d3.selectAll(".node-fl");

        var count = 0;

        force.on("tick", function(){
            arrow();
            count = count + 1;
        	link.attr("x1", function(d){ return d.source.x })
        		.attr("y1", function(d){ return d.source.y })
        		.attr("x2", function(d){ return d.target.x })
        		.attr("y2", function(d){ return d.target.y });

        	node.attr("cx", function(d){ return d.x })
        		.attr("cy", function(d){ return d.y });

            if(count >= iter){
                count = 0;
                force.stop();
            }
        });

        svg.on("mousemove", function() {
            if(ATR.fe_flag){
                fisheye.focus([(d3.mouse(this)[0]-pos_transl[0])*(1/pos_scale), (d3.mouse(this)[1]-pos_transl[1])*(1/pos_scale)]);

                node.each(function(d) { d.fisheye = fisheye(d); })
                  .attr("cx", function(d) { return d.fisheye.x; })
                  .attr("cy", function(d) { return d.fisheye.y; })
                  .attr("r", function(d) { return d.fisheye.z * 4.5; });

                link.attr("x1", function(d) { return d.source.fisheye.x; })
                  .attr("y1", function(d) { return d.source.fisheye.y; })
                  .attr("x2", function(d) { return d.target.fisheye.x; })
                  .attr("y2", function(d) { return d.target.fisheye.y; });
            }
        });

        function mousedclick_tweet(d){
            d3.event.preventDefault();
            ATR.back_to_section2 = false;
            ATR.labeling_request_rc_flag = false;
            var keys = Object.keys(ATR.data_for_vis_queue_hash2);
            for(var i in keys){
                if(ATR.data_for_vis_queue_hash2[keys[i]] == d.index){
                    ATR.change_labeling_request(Number(keys[i]), "force_layout");
                }
            }
        }

        function mouseclick(d,i,el){
            if(el == 0){
                el = this;
            }
            // deselect node and all conections
            if(d3.select(el).attr("selected") == "true"){
                d3.select(el).attr("selected", false);
                d3.select(el).style("opacity", 0.3);
                d3.select(el).attr("count", 0);
                clean_path(el, d, true);
                d3.select(el).attr("manualy_selected", false);
            }else{
                d3.select(el).attr("manualy_selected", true);
                highlight_path(el, d, true);
                node.each(function(d,i){
                    if(d3.select(this).attr("selected") != "true")
                        d3.select(this)
                            .style("opacity", 0.3)
                    else{
                        d3.select(this)
                            .style("opacity", 1)
                    }
                })
            }
        }

        function highlight_path(el, d, c){
            if(c){
                d3.select(el).attr("selected", true);
            }

            if(d.index != ATR.data_for_vis_queue_hash2[String(ATR.labeling_request_curr)] && d3.select(el).attr("labeling-act") != "true")
                d3.select(el).attr("stroke", "gray");
            d3.select(el).attr("stroke-width", "3px");

            var parent = el;

            svg.selectAll("line.link-fl.target-" + d.index)
                  .classed("target", true)
                  .each(updateNodes("source", true, c, parent));

            svg.selectAll("line.link-fl.source-" + d.index)
                .classed("source", true)
                .each(updateNodes("target", true, c, parent));
        }

        function clean_path(el,d,c){
            var parent = el;

            if(d3.select(el).attr("selected") == "false" || d3.select(el).attr("manualy_selected") == "false"){
                if(d3.select(el).attr("selected") == "false"){
                    if(d.index != ATR.data_for_vis_queue_hash2[String(ATR.labeling_request_curr)] && d3.select(el).attr("labeling-act") != "true")
                        d3.select(el).attr("stroke", "white");
                    d3.select(el).attr("stroke-width", "1.5px");
                }

                svg.selectAll("line.link-fl.source-" + d.index)
                    .classed("source", false)
                    .each(updateNodes("target", false, c, parent));

                svg.selectAll("line.link-fl.target-" + d.index)
                    .classed("target", false)
                    .each(updateNodes("source", false, c, parent));
            }
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
                    svg.select("#node-"+d[name].index).attr("count", function(d){
                        return Number(d3.select(this).attr("count"))+1;
                    });
                    svg.select("#node-"+d[name].index).attr("selected", true)
                    svg.select("#node-"+d[name].index).style("opacity", 1)
                    if(d[name].index != ATR.data_for_vis_queue_hash2[String(ATR.labeling_request_curr)] && svg.select("#node-"+d[name].index).attr("labeling-act") != "true")
                        svg.select("#node-"+d[name].index).attr("stroke", "gray");
                    svg.select("#node-"+d[name].index).attr("stroke-width", "3px");
                }
            }else{
                if(c){
                    if(d3.select(p).attr("manualy_selected") == "true"){
                        svg.select("#node-"+d[name].index).attr("count", function(d){
                            return Number(d3.select(this).attr("count"))-1;
                        });
                        if(Number(svg.select("#node-"+d[name].index).attr("count")) == 0){
                            svg.select("#node-"+d[name].index).attr("selected", false)
                            svg.select("#node-"+d[name].index).style("opacity", 0.3)
                            if(d[name].index != ATR.data_for_vis_queue_hash2[String(ATR.labeling_request_curr)] && svg.select("#node-"+d[name].index).attr("labeling-act") != "true")
                                svg.select("#node-"+d[name].index).attr("stroke", "white");
                            svg.select("#node-"+d[name].index).attr("stroke-width", "1.5px");
                        }
                    }
                }
            }
            svg.select("#node-" + d[name].index).classed(name, value);
          };
        }

        function_fe_force_layout = function(){
            ATR.fe_flag = !ATR.fe_flag;
            d3.select("#fe-force-layout-button").classed("active", ATR.fe_flag)
            force
                .stop();
        }

        function_lr_highlight_force_layout = function(){
            ATR.arrow_flag = !ATR.arrow_flag;
            arrow();
            d3.select("#lr-force-layout-button").classed("active", ATR.arrow_flag)
            if(ATR.arrow_flag){
                node.each(function(d,i){
                    if(d.name.labeling){
                        if(d.index != ATR.data_for_vis_queue_hash2[String(ATR.labeling_request_curr)])
                            d3.select(this)
                                .attr("stroke", "black")
                                .attr("labeling-act", true)
                    }else{
                        if(d.index != ATR.data_for_vis_queue_hash2[String(ATR.labeling_request_curr)])
                            d3.select(this)
                                .attr("stroke", "white")
                                .attr("labeling-act", false)
                    }
                })
            }else{
                node.each(function(d,i){
                    if(d.index != ATR.data_for_vis_queue_hash2[String(ATR.labeling_request_curr)])
                            d3.select(this)
                                .attr("stroke", "white")
                                .attr("labeling-act", false)
                })

                arrow_tooltip.select(".new-tooltip.arrow").style("visibility", "hidden")
                arrow_tooltip.select(".tooltip-inner.arrow").style("visibility", "hidden")
            }
        }

        function mousedclick(d){
            node.each(function(d,i){
                d3.select(this).attr("selected", false);
                d3.select(this).attr("manualy_selected", false);
                d3.select(this).attr("count", 0);
                d3.select(this).style("opacity", 1)
            });
            d3.selectAll(".panel-body.force-layout svg circle").each(function(d){
                clean_path(this, d, false);
            })
        }

        function arrow(){
            if(!ATR.done_execution){
                if(ATR.arrow_flag){
                    var pos = [(d3.select("#node-"+ATR.data_for_vis_queue_hash2[String(ATR.labeling_request_curr)])[0][0].getBoundingClientRect().left + $(window)['scrollLeft']()), d3.select("#node-"+ATR.data_for_vis_queue_hash2[String(ATR.labeling_request_curr)])[0][0].getBoundingClientRect().bottom + $(window)['scrollTop']()];
                    arrow_tooltip.select(".tooltip-inner.arrow").style("visibility", "visible")
                    arrow_tooltip.select(".tooltip-inner.arrow").html('Labeling Request <button type="button" class="close" aria-label="Close"><span aria-hidden="true">×</span></button>')
                    arrow_tooltip.select(".tooltip-inner.arrow").style("top", (pos[1]-arrow_tooltip.select(".tooltip-inner.arrow").style("height").split("px")[0]-20)+"px").style("left",(pos[0]-arrow_tooltip.select(".tooltip-inner.arrow").style("width").split("px")[0]/2)+"px");
                    arrow_tooltip.select(".new-tooltip.arrow").style("visibility", "visible")
                    arrow_tooltip.select(".new-tooltip.arrow").style("top", (pos[1]-arrow_tooltip.select(".new-tooltip.arrow").style("height").split("px")[0]-20)+"px").style("left",(pos[0]-arrow_tooltip.select(".new-tooltip.arrow").style("width").split("px")[0]/2)+"px");

                    arrow_tooltip.select(".tooltip-inner.arrow button").on('click', function(d){
                        ATR.arrow_flag = !ATR.arrow_flag;
                        arrow_tooltip.select(".new-tooltip.arrow").style("visibility", "hidden")
                        arrow_tooltip.select(".tooltip-inner.arrow").style("visibility", "hidden")
                    })
                }
            }
        }

        function mouseover(d){
            tooltip.select(".tooltip-inner").style("visibility", "visible")
            tooltip.select(".tooltip-inner").html("<span >" + d.name.text + "</span><p class='twitter-info'><br /><b>— "+d.name.fullname+" (@"+d.name.username+") "+d.name.created_at+"</b></p>")
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

        function zoomed() {
  			container.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
            pos_transl = d3.event.translate;
            pos_scale = d3.event.scale;
            arrow();
		}

		function dragstarted(d) {
		  d3.event.sourceEvent.stopPropagation();
		  d3.select(this).classed("dragging", true);
		}

		function dragged(d) {
            d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);
            force.start();
		}

		function dragended(d) {
		  d3.select(this).classed("dragging", false);
          arrow();
		}
	}
}