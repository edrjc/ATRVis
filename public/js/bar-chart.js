function draw_bar_chart(bwidth, bheight, data_for_chart){
  if(data_for_chart){
    arrow_flag = false;

    var margin = {top: 40, right: 20, bottom: 50, left: 40},
        width = bwidth - margin.left - margin.right,
        height = bheight - margin.top - margin.bottom;

    //var formatPercent = d3.format(".0%");

    var x = d3.scale.ordinal()
        .rangeRoundBands([20, width-20], .1);

    var y = d3.scale.linear()
        .range([height, 0]);

    var xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom")
        .tickFormat("")
        .tickSize(0);

    var yAxis = d3.svg.axis()
        .scale(y)
        .orient("left");
        //.tickFormat(formatPercent);

    var svg = d3.select(".panel-body.chart").append("svg").attr("class", "bar-chart").attr("id", "svg1")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .style("z-index", "2")
      .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var new_data = [
        {"debate":"ajuste fiscal","val":0.0}
        ,{"debate":"previdência social","val":0.0}
        ,{"debate":"direitos do trabalhador","val":0.0}
        ,{"debate":"bndes","val":0.0}
        ,{"debate":"reforma política","val":0.0}
        ,{"debate":"none","val":0.0}
    ]

    if(data_for_chart != undefined){
        data = data_for_chart.scores;
        for(var i in data){
            for(var j in new_data){
                if(data[i].debate == new_data[j].debate){
                    new_data[j].val = data[i].val;
                }
            }
        }
    }

    x.domain(new_data.map(function(d) { return d.debate; }));
    y.domain([0, d3.max(new_data, function(d) { return d.val; })]);

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    // Add the text label for the x axis
    svg.append("text")
        .attr("transform", "translate(" + (width / 2) + " ," + (height + margin.bottom - 25) + ")")
        .style("text-anchor", "middle")
        .text("Debate");

    svg.append("g")
        .attr("class", "y axis")
        .attr("transform", "translate(20,0)")
        .call(yAxis)
      .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left - 20)
        .attr("x",0 - (height / 2))
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Frequency");

    svg.selectAll(".bar")
        .data(new_data)
      .enter().append("rect")
        .attr("class", "bar")
        .attr("x", function(d) { return x(d.debate); })
        .attr("width", x.rangeBand())
        .attr("y", function(d) {
            if(d.val > 0)
                return y(d.val);
            else
                return y(d.val)-3;
        })
        .attr("height", function(d) {
            if((height - y(d.val)) > 0.0){
                return height - y(d.val);
            }
            else{
                return 3;
            }
        })
        .on('mouseover', function(d){
            tooltip.select(".tooltip-inner").style("visibility", "visible")
            tooltip.select(".tooltip-inner").html("<span style='font-weight:bold'>Frequency:</span> <span>" + d.val + "</span><br /><span style='font-weight:bold'>Debate:</span> <span>" + d.debate + "</span>")
            tooltip.select(".tooltip-inner").style("top", (event.pageY-tooltip.select(".tooltip-inner").style("height").split("px")[0]-60)+"px").style("left",(event.pageX-tooltip.select(".tooltip-inner").style("width").split("px")[0]/2)+"px");
            tooltip.select(".new-tooltip").style("visibility", "visible")
            tooltip.select(".new-tooltip").style("top", (event.pageY-tooltip.select(".new-tooltip").style("height").split("px")[0]-60)+"px").style("left",(event.pageX-tooltip.select(".new-tooltip").style("width").split("px")[0]/2)+"px");
        })
        .on('mouseout', function(d){
            tooltip.select(".new-tooltip").style("visibility", "hidden")
            tooltip.select(".tooltip-inner").style("visibility", "hidden")
        })
        .on('click', mouseclick);

    // show debate info
    function mouseclick(d,i){
        // updating panel colors and debate info
        ATR.show_discriminative_keyword(d.debate);
        ATR.retrieved_tweets(d3.select(".list-group.debates li#cl"+((Number(i))+1))[0][0],d.debate,Number(i));
        ATR.color_panels(true, i);
    }

    // changing bars' color
    d3.selectAll(".bar").each(function(d,i){
      d3.select(this).style("fill", ATR.colorScale(i));
    })
  }
}