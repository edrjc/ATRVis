function reply_chain(bwidth, bheight){
	if(ATR.reply_chain_data){
		var zoom = d3.behavior.zoom()
		    .scaleExtent([-10, 10])
		    .on("zoom", zoomed);

		var margin = {top: 0, right: 0, bottom: 20, left: 20},
            width = bwidth - margin.left - margin.right,
            height = bheight - margin.top - margin.bottom,
            r = 5,
            tree_size = 0;

        if(height > width)
            tree_size = [360, (width/2) - margin.left]
        else
            tree_size = [360, (height/2) - margin.bottom]

        var tree = d3.layout.tree()
            .size(tree_size)
            .separation(function(a, b) { return (a.parent == b.parent ? 1 : 2) / a.depth; });

        var diagonal = d3.svg.diagonal.radial()
            .projection(function(d) {
                if(!(isNaN(d.x / 180 * Math.PI)))
                    return [d.y, d.x / 180 * Math.PI];
                else
                    return [d.y, 0];
            });

        var svg = d3.select(".panel-body.reply-chain").append("svg")
            .attr("class", "reply-chain")
            .attr("width", width)
            .attr("height", height)
            .call(zoom)
            .on("dblclick.zoom", null)
            .append("g")
                .attr("transform", "translate(" + (width/2) + "," + height/2 + ")")

        var nodes = tree.nodes(ATR.reply_chain_data),
            links = tree.links(nodes);

        var link = svg.selectAll(".link-reply-chain")
            .data(links)
            .enter().append("path")
                .attr("class", "link-reply-chain")
                .attr("d", diagonal);

        var node = svg.selectAll(".node-reply-chain")
            .data(nodes)
            .enter().append("g")
                .attr("class", "node-reply-chain")
                .attr("transform", function(d) {
                    if(!(isNaN(d.x)))
                        return "rotate(" + (d.x - 90) + ")translate(" + d.y + ")";
                    else
                        return "rotate(" + (0 - 90) + ")translate(" + d.y + ")";
                })

        node.append("circle")
            .attr("r", r)
            .attr("fill", function(d,i){
                if(d.classe_number != -1)
                    return ATR.colorScale(d.classe_number);
                else
                    return "gray";
            })
            .attr("stroke", function(d,i){
                if(i == 0){
                    return "black";
                }else{
                    return "white";
                }
            })
            .attr("class", function(d,i){
                if(i == 0){
                    return "root";
                }else{
                    return "";
                }
            })
            .on("mouseover", mouseover)
            .on("mouseout", mouseout)
            .on("dblclick", function(d){
                for(i in ATR.atrvis_data.dataset){
                    if(ATR.atrvis_data.dataset[i].id == d.id){
                        ATR.back_to_section2 = true;
                        ATR.labeling_request_rc_flag = true;
                        ATR.data_for_bundle = null;
                        ATR.data_for_force_layout = null;
                        ATR.change_labeling_request(Number(i), "Reply Chain");
                    }
                }
            })

        update_reply_chain_number(nodes.length);

        function update_reply_chain_number(qtd){
            // cleaning number
            d3.selectAll(".panel.panel-default.reply-chain div.panel-heading p").remove();
            // showing number of classes
            d3.select(".panel.panel-default.reply-chain div.panel-heading").append("p")
                .attr("class", "tweets-number")
                .style({
                    "text-align": "center",
                    "font-size": "1em",
                    "font-weight": "300",
                    "color": "white",
                    "text-shadow": "-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black"
                })
                .text(qtd+" TWEETS");
            d3.select(".panel.panel-default.reply-chain div.panel-heading").append("p")
                .attr("class", "rc-number")
                .style({
                    "text-align": "center",
                    "font-size": "1em",
                    "font-weight": "300",
                    "color": "white",
                    "text-shadow": "-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black"
                })
                .text((ATR.rc_curr+1)+" of "+ATR.list_of_rc.length);
        }

        function mouseover(d){
            var classe_name = ATR.classes_name[d.classe_number];
            if(classe_name == undefined)
                classe_name = "non-retrieved";
            tooltip.select(".tooltip-inner").style("visibility", "visible")
            tooltip.select(".tooltip-inner").html("<span >" + d.name + "</span><p class='twitter-info'><br /><b>— "+d.fullname+" (@"+d.username+") "+d.created_at+"</b></p><hr><span style='font-weight:bold'>Debate:</span> <span>" + classe_name + "</span>")
            tooltip.select(".tooltip-inner").style("top", (event.pageY-tooltip.select(".tooltip-inner").style("height").split("px")[0]-60)+"px").style("left",(event.pageX-tooltip.select(".tooltip-inner").style("width").split("px")[0]/2)+"px");
            tooltip.select(".new-tooltip").style("visibility", "visible")
            tooltip.select(".new-tooltip").style("top", (event.pageY-tooltip.select(".new-tooltip").style("height").split("px")[0]-60)+"px").style("left",(event.pageX-tooltip.select(".new-tooltip").style("width").split("px")[0]/2)+"px");

            if(d3.select(this).attr("class") != "root"){
                d3.select(this).attr("stroke", "gray");
                d3.select(this).attr("stroke-width", "3px");
            }else{
                d3.select(this).attr("stroke-width", "3px");
            }
        }

        function mouseout(d) {
            tooltip.select(".new-tooltip").style("visibility", "hidden")
            tooltip.select(".tooltip-inner").style("visibility", "hidden")

            if(d3.select(this).attr("class") != "root"){
                d3.select(this).attr("stroke", "white");
                d3.select(this).attr("stroke-width", "1.5px");
            }else{
                d3.select(this).attr("stroke-width", "1.5px");
            }
        }

        function zoomed() {
            svg.attr("transform", "translate(" + ([d3.event.translate[0]+(width/2)*d3.event.scale, d3.event.translate[1]+(height/2)*d3.event.scale]) + ")scale(" + (d3.event.scale) + ")");
        }
	}
}
