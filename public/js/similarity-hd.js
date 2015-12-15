function similarity_hd(bwidth, bheight, current_hashtag){
    if(ATR.data_for_similarity_hd){

        var margin = {top: 0, right: 0, bottom: 40, left: 40},
        width = bwidth - margin.left - margin.right,
        height = bheight - margin.top - margin.bottom;

        var r = 5,
            rect = 20;

        var drag = d3.behavior.drag()
            .origin(function(d) { return d; })
            .on("dragstart", dragstarted)
            .on("drag", dragged)
            .on("dragend", dragended);

        var svg = d3.select(".panel-body.similarity-hd").append("svg").attr("class", "similarity-hd").attr("id", "svg6")
            .attr("width", width)
            .attr("height", height)

        var container = svg.append("g");

        // getting max
        var max = 0.0;
        for(var i in ATR.new_data_similarity_hd){
            for(var j in ATR.new_data_similarity_hd[i].debates){
                if(ATR.new_data_similarity_hd[i].debates[j].val > max){
                    max = ATR.new_data_similarity_hd[i].debates[j].val;
                }
            }
        }

        var stroke_w = d3.scale.linear()
            .domain([0, max])
            .range([0, rect]);

        var paths = container.append("g")
            .attr("class", "links-shd")
            .selectAll(".link-shd")
            .data(ATR.data_for_similarity_hd.links)
            .enter().append("line")
            .attr("class", "link-shd")
            .style("stroke-width", function(d){
                if(stroke_w(d.value) < 1)
                    return 1;
                else
                    return stroke_w(d.value);
            })
            .style("stroke", "#BCBCBC")
            .style("opacity", function(d){
                if(d.source == 0)
                    return 1;
                else
                    return 0;
            })

        var nodes = container.append("g")
            .attr("class", "nodes-shd")
            .selectAll(".node-shd")
            .data(ATR.data_for_similarity_hd.nodes)
            .enter().append("g")
            .attr("class", function(d){
                return d.type;
            })

        var tweet_nodes = container.selectAll(".hashtag").append("text")
            .attr("font-family", '"Helvetica Neue",Helvetica,Arial,sans-serif')
            .attr("font-size", "14px")
            .attr("text-anchor", "start")
            .attr("font-weight", "bold")
            .attr("id", function(d,i){
                return "sim_hashtag"+i;
            })
            .style("cursor", "default")
            .style("fill", "black")
            .style("opacity", function(d,i){
                if(i == 0)
                    return 1;
                else
                    return 0.3;
            })
            .text(function(d){
                if(d.name.length > 10)
                    return "#"+d.name.substr(0,10)+"...";
                else
                    return "#"+d.name;
            })
            .on('mousedown', mouseclick)
            .on('mouseover', mouseover)
            .on('mouseout', mouseout)
            .call(drag);

        var tweets_squares = container.selectAll(".hashtag").append("rect")
            .attr("width", rect)
            .attr("height", rect)
            .attr("stroke", "white")
            .attr("stroke-width", "1.5px")
            .style("fill", "black")

        var y_tweets = d3.scale.linear()
            .domain([-1, 2])
            .range([0, height-(4*r)+Number(d3.select(".panel-body.similarity-hd-list").style("height").split("px")[0])]);

        // update tweets positions
        tweet_nodes.each(function(d,i){
            d3.select(this).attr("x", (4*r));
            d3.select(this).attr("y", y_tweets(i)+(2*r));
        })

        // update tweets squares positions
        tweets_squares.each(function(d,i){
            d3.select(this).attr("x", get_node_position(i)[0]+rect/2);
            d3.select(this).attr("y", get_node_position(i)[1]-2*r);
        })

        var debate_nodes = container.selectAll(".debate").append("rect")
            .attr("width", rect)
            .attr("height", rect)
            .attr("stroke", "white")
            .attr("stroke-width", "1.5px")
            .style("fill", function(d){
                if(d.debate_number != -1){
                    return ATR.colorScale(d.debate_number)
                }else{
                    return ATR.color4;
                }
            })
            .on('mouseover', mouseover)
            .on('mouseout', mouseout)
            .on('click', mouseclick_debates)

        debate_nodes.each(function(d,i){
            highlight_debates(d,i,this,0)
        })

        var y_debates = d3.scale.linear()
            .domain([0, debate_nodes[0].length-1])
            .range([0, height-(2*rect)]);

        // update debates positions
        debate_nodes.each(function(d,i){
            d3.select(this).attr("x", width-(2*rect));
            d3.select(this).attr("y", y_debates(i)+(rect));
        })

        paths.each(function(d,i){
            d3.select(this)
                .attr("x1", function(d){ return get_node_position(d.source)[0]+rect })
                .attr("y1", function(d){ return get_node_position(d.source)[1] })
                .attr("x2", function(d){ return get_node_position(d.target)[0] })
                .attr("y2", function(d){ return get_node_position(d.target)[1] });
        })

        function dragstarted(d,i){
        }

        function dragged(){
            d3.select(this)
                .attr("x", d3.mouse(this)[0]-d3.select(this).style("width").split("px")[0]/2)
                .attr("y", d3.mouse(this)[1])
        }

        function assign_hashtags_tweets(ic,i){
            if(ATR.shd_label_all){
                ATR.shd_label_all = false;
                // find related debates
                var related_debates = []
                paths.each(function(d,i){
                    if(d.source == ic){
                        related_debates.push(d.target-tweet_nodes[0].length)
                    }
                })

                // find related tweets
                var all_related_tweets = []
                for(var k in related_debates){
                    for(var j in ATR.new_data_similarity_hd[current_hashtag].debates[related_debates[k]].tweets){
                        all_related_tweets.push([ATR.new_data_similarity_hd[current_hashtag].debates[related_debates[k]].tweets[j].text, ATR.new_data_similarity_hd[current_hashtag].debates[related_debates[k]].tweets[j].id]);
                    }
                }

                // change association
                for(var k in all_related_tweets){
                    var res = get_tweet_info(Number(all_related_tweets[k][1]));
                    if(Number(res[0]) != i){
                        ATR.atrvis_data.dataset[Number(all_related_tweets[k][1])].scores[i].val = res[2] + 0.5;
                        // for video
                        if(Number(res[0]) == -1){
                            ATR.retrieved_tweets_count = ATR.retrieved_tweets_count + 1;
                            d3.select(".retrieval-info").text(ATR.retrieved_tweets_count);
                        }
                        ATR.atrvis_data.dataset[Number(all_related_tweets[k][1])].true_label = ATR.classes_name[i];
                    }
                }

                // change similarities
                var sum = 0.0;
                for(var k in related_debates){
                    sum = sum + ATR.new_data_similarity_hd[current_hashtag].debates[related_debates[k]].val;
                }
                for(var k in ATR.hashtag_deb_sim_data.HashTags[current_hashtag].scores){
                    ATR.hashtag_deb_sim_data.HashTags[current_hashtag].scores[k].val = 0.0;
                }
                ATR.hashtag_deb_sim_data.HashTags[current_hashtag].scores[i].val = sum;

                // update views
                // - getting ids
                var ids = [];
                for(var k in all_related_tweets){
                    ids.push(ATR.atrvis_data.dataset[all_related_tweets[k][1]].id);
                }

                // assigning hashtag to debate
                var old_deb = -1;
                var keys = Object.keys(ATR.disc_features_data);
                var hashtag = "#"+ATR.hashtag_deb_sim_data.HashTags[current_hashtag].tagStr;
                for(var k in keys){
                    for(var l in ATR.disc_features_data[keys[k]]){
                        if(ATR.disc_features_data[keys[k]][l][hashtag] != undefined){
                            old_deb = keys[k];
                        }
                    }
                }
                ATR.update_discriminative_features(hashtag, ATR.classes_name[i], old_deb);

                ATR.resize(true, ids, i);
                var res = ATR.get_data_to_label_informations();
                ATR.retrieved_tweets(d3.select("#cl"+(Number(res[0])+1))[0][0], {"classe": res[1]}, Number(res[0]));

                ATR.update_labeling_request();
            }else{
                // find related debates
                var related_debates = []
                paths.each(function(d,i){
                    if(d.source == ic){
                        related_debates.push(d.target-tweet_nodes[0].length)
                    }
                })
                // change similarities
                var sum = 0.0;
                for(var k in related_debates){
                    sum = sum + ATR.new_data_similarity_hd[current_hashtag].debates[related_debates[k]].val;
                }
                for(var k in ATR.hashtag_deb_sim_data.HashTags[current_hashtag].scores){
                    ATR.hashtag_deb_sim_data.HashTags[current_hashtag].scores[k].val = 0.0;
                }
                ATR.hashtag_deb_sim_data.HashTags[current_hashtag].scores[i].val = sum;

                // assigning hashtag to debate
                var old_deb = -1;
                var keys = Object.keys(ATR.disc_features_data);
                var hashtag = "#"+ATR.hashtag_deb_sim_data.HashTags[current_hashtag].tagStr;
                for(var k in keys){
                    for(var l in ATR.disc_features_data[keys[k]]){
                        if(ATR.disc_features_data[keys[k]][l][hashtag] != undefined){
                            old_deb = keys[k];
                        }
                    }
                }
                console.log(old_deb);
                ATR.update_discriminative_features(hashtag, ATR.classes_name[i], old_deb);
                ATR.data_for_similarity_hd = null;
                ATR.resize(false, null, null, true);
                ATR.update_labeling_request();
            }
            $('#myModal2').unbind('hidden.bs.modal');
            // for video
            ATR.labeling_count = ATR.labeling_count + 1;
            d3.select(".navbar-brand.history").text("HISTORY ("+ATR.labeling_count+")");
            d3.select(".pagination.list-inline.iter li#iterc a").text(ATR.labeling_count);
            d3.select(".pagination.list-inline.iter li#iterp").attr("class", "")
            //load_data(1);
        }

        function dragended(){
            var ic = Number(d3.select(this).attr("id").split("sim_hashtag")[1]);
            var hashtag_pos = d3.mouse(this);
            debate_nodes.each(function(d,i){
                var deb_pos = [d3.select(this).attr("x"), d3.select(this).attr("y")]
                if(hashtag_pos[0] >= deb_pos[0] && hashtag_pos[0] <= Number(deb_pos[0])+rect && hashtag_pos[1] >= deb_pos[1] && hashtag_pos[1] <= Number(deb_pos[1])+rect){
                    var input = [ic, i]
                    $('#myModal2').modal()
                    $('#myModal2').modal({ keyboard: false })
                    $('#myModal2').modal('show');
                    $('#myModal2').on('hidden.bs.modal', function () {
                        assign_hashtags_tweets(input[0], input[1]);
                    })

                    /*// find related debates
                    var related_debates = []
                    paths.each(function(d,i){
                        if(d.source == ic){
                            related_debates.push(d.target-tweet_nodes[0].length)
                        }
                    })

                    // find related tweets
                    var all_related_tweets = []
                    for(var k in related_debates){
                        for(var j in ATR.new_data_similarity_hd[current_hashtag].debates[related_debates[k]].tweets){
                            all_related_tweets.push([ATR.new_data_similarity_hd[current_hashtag].debates[related_debates[k]].tweets[j].text, ATR.new_data_similarity_hd[current_hashtag].debates[related_debates[k]].tweets[j].id]);
                        }
                    }

                    // change association
                    for(var k in all_related_tweets){
                        var res = get_tweet_info(Number(all_related_tweets[k][1]));
                        if(Number(res[0]) != i){
                            ATR.atrvis_data.dataset[Number(all_related_tweets[k][1])].scores[i].val = res[2] + 0.5;
                        }
                    }

                    // change similarities
                    var sum = 0.0;
                    for(var k in related_debates){
                        sum = sum + ATR.new_data_similarity_hd[current_hashtag].debates[related_debates[k]].val;
                    }
                    for(var k in ATR.hashtag_deb_sim_data.HashTags[current_hashtag].scores){
                        ATR.hashtag_deb_sim_data.HashTags[current_hashtag].scores[k].val = 0.0;
                    }
                    ATR.hashtag_deb_sim_data.HashTags[current_hashtag].scores[i].val = sum;

                    // update views
                    // - getting ids
                    var ids = [];
                    for(var k in all_related_tweets){
                        ids.push(ATR.atrvis_data.dataset[all_related_tweets[k][1]].id);
                    }
                    ATR.resize(true, ids, i);
                    var res = ATR.get_data_to_label_informations();
                    ATR.retrieved_tweets(d3.select("#cl"+(Number(res[0])+1))[0][0], {"classe": res[1]}, Number(res[0]));*/
                }
            })
            tweet_nodes.each(function(d,i){
                d3.select(this).attr("x", (4*r));
                d3.select(this).attr("y", y_tweets(i)+(2*r));
            })
        }

        function get_tweet_info(id){
                var max = 0.0;
                var deb = -1;
                var debate_name = "";
                for(i in ATR.atrvis_data.dataset[id].scores){
                    if(ATR.atrvis_data.dataset[id].scores[i].val > max){
                        max = ATR.atrvis_data.dataset[id].scores[i].val;
                        deb = i;
                        debate_name = ATR.atrvis_data.dataset[id].scores[i].debate;
                    }
                }
                return [deb, debate_name, max];
        }

        function get_node_position(id){
            if(id < tweet_nodes[0].length){
                return [Number(d3.select(tweet_nodes[0][id]).attr("x"))+90, d3.select(tweet_nodes[0][id]).attr("y")]
            }else{
                id = id - tweet_nodes[0].length;
                return [Number(d3.select(debate_nodes[0][id]).attr("x"))+(rect/2), Number(d3.select(debate_nodes[0][id]).attr("y"))+(rect/2)]
            }
        }

        mouseclick({"name": ATR.data_for_similarity_hd.nodes[0].name, "type": ATR.data_for_similarity_hd.nodes[0].type}, 0)
        function mouseclick(d,i){
            // show paths
            ic = i
            // highlight tweet and square
            tweet_nodes.each(function(d,i){
                if(ic != i){
                    d3.select(this)
                        .style("opacity", 0.3)
                }else{
                    d3.select(this)
                        .style("opacity", 1)
                }
            })
            tweets_squares.each(function(d,i){
                if(ic != i){
                    d3.select(this)
                        .style("opacity", 0.3)
                }else{
                    d3.select(this)
                        .style("opacity", 1)
                }
            })
            // highlight path
            paths.each(function(d,i){
                if(d.source == ic){
                    d3.select(this)
                        .style("opacity", 1)
                }else{
                    d3.select(this)
                        .style("opacity", 0)
                }
            })
            // highlight debate
            debate_nodes.each(function(d,i){
                highlight_debates(d,i,this,ic)
            })
            // find related debates
            var related_debates = []
            paths.each(function(d,i){
                if(d.source == ic){
                    related_debates.push(d.target-tweet_nodes[0].length)
                }
            })
            //current_hashtag = ic;
            // cleaning tweets
            d3.selectAll(".list-group.rp-hd-info li").remove();
            // showing tweets
            // - sampled tweets
            var tweets_sample = [];
            var qtd = 0;
            var total = 0;

            for(var k in related_debates){
                var examples = []
                for(var j in ATR.new_data_similarity_hd[current_hashtag].debates[related_debates[k]].tweets){
                    examples.push([ATR.atrvis_data.dataset[ATR.new_data_similarity_hd[current_hashtag].debates[related_debates[k]].tweets[j].id].text, ATR.new_data_similarity_hd[current_hashtag].debates[related_debates[k]].tweets[j].id]);
                    total = total + 1;
                }
                var shuffled_examples = shuffle(examples);
                var count = 0;
                if(shuffled_examples.length > 0){
                    for(var j in shuffled_examples){
                        qtd = qtd + 1;
                        count = count + 1;
                        d3.select(".list-group.rp-hd-info")
                            .append("li").attr("class", "list-group-item retrieved-tweets-rc-hd").attr("id", "rc"+j).style({
                                "border-color": ATR.colorScale(related_debates[k])
                            })
                            .attr("d", shuffled_examples[j][1])
                            .on('dblclick', function(d){
                                ATR.back_to_section2 = true;
                                ATR.labeling_request_rc_flag = false;
                                ATR.data_for_bundle = null;
                                ATR.data_for_force_layout = null;
                                ATR.change_labeling_request(Number(d3.select(this).attr("d")));
                            })
                            .append("p").attr("class", "list-group-item-text").text(shuffled_examples[j][0])
                            .style({
                                "font-size": "16px",
                                "font-weight": "normal",
                                "line-height": "20px"
                            });
                        if(count >= 3) break;
                    }
                }
            }
            if(total == 0){
                d3.select(".list-group.rp-hd-info")
                    .append("li").attr("class", "list-group-item retrieved-tweets-rc-hd").attr("id", "rc"+0).style({
                        "border-color": ATR.colorScale(related_debates[k])
                    })
                    .append("p").attr("class", "list-group-item-text").text("no tweets associated...")
                    .style({
                        "font-size": "16px",
                        "font-weight": "normal",
                        "line-height": "20px"
                    });
            }
            // resizing retrieved tweets tab
            d3.select(".panel-body.rp-hd-info").style("height", d3.select(".panel-body.similarity-hd").style("height"));
            update_retrieved_tweets_shd_number(qtd, total, true);
        }

        function update_retrieved_tweets_shd_number(qtd, total, hashtag){
            // cleaning number
            d3.selectAll(".panel.panel-default.rp-hd-info div.panel-heading p").remove();
            var text1 = "";
            var text2 = "containing #"+ATR.new_data_similarity_hd[current_hashtag].name+" in all tweets";
            if(hashtag){
                text1 = "SHOWING "+qtd+" OF "+total+" TWEETS";
            }else{
                text1 = total+" TWEETS";
            }
            // showing number of classes
            d3.select(".panel.panel-default.rp-hd-info div.panel-heading").append("p")
                .attr("class", "tweets-number")
                .style({
                    "text-align": "center",
                    "font-size": "1em",
                    "font-weight": "300",
                    "color": "white",
                    "text-shadow": "-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black"
                })
                .text(text1);
            d3.select(".panel.panel-default.rp-hd-info div.panel-heading").append("p")
                .style({
                    "text-align": "center",
                    "font-size": "1em",
                    "font-weight": "300",
                    "color": "white",
                    "text-shadow": "-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black"
                })
                .text(text2);
        }

        function highlight_debates(d,i,el,ic){
                var id = i + tweet_nodes[0].length;
                var this_debate = el;
                d3.select(this_debate).style("opacity", 0.3);
                paths.each(function(d,i){
                    if(d.source == 0 && d.target == id){
                        if(d.value > 0.0 || d.value2 > 0.0)
                            d3.select(this_debate).style("opacity", 1);
                        else
                            d3.select(this_debate).style("opacity", 0.3);
                    }
                })
        }

        function mouseclick_debates(d){
            // cleaning tweets
            d3.selectAll(".list-group.rp-hd-info li").remove();
            // showing tweets
            for(j in ATR.new_data_similarity_hd[current_hashtag].debates[Number(d.debate_number)].tweets){
                d3.select(".list-group.rp-hd-info")
                    .append("li").attr("class", "list-group-item retrieved-tweets-rc-hd").attr("id", "rc"+j).style({
                        "border-color": ATR.colorScale(Number(d.debate_number))
                    })
                    .attr("d", ATR.new_data_similarity_hd[current_hashtag].debates[Number(d.debate_number)].tweets[j].id)
                    .on('dblclick', function(d){
                        ATR.back_to_section2 = true;
                        ATR.labeling_request_rc_flag = false;
                        ATR.data_for_bundle = null;
                        ATR.data_for_force_layout = null;
                        ATR.change_labeling_request(Number(d3.select(this).attr("d")));
                    })
                    .append("p").attr("class", "list-group-item-text").text(ATR.atrvis_data.dataset[ATR.new_data_similarity_hd[current_hashtag].debates[Number(d.debate_number)].tweets[j].id].text)
                    .style({
                        "font-size": "16px",
                        "font-weight": "normal",
                        "line-height": "20px"
                    });
            }

            if(ATR.new_data_similarity_hd[current_hashtag].debates[Number(d.debate_number)].tweets.length == 0){
                d3.select(".list-group.rp-hd-info")
                    .append("li").attr("class", "list-group-item retrieved-tweets-rc-hd").attr("id", "rc"+0).style({
                        "border-color": ATR.colorScale(Number(d.debate_number))
                    })
                    .append("p").attr("class", "list-group-item-text").text("no tweets associated...")
                    .style({
                        "font-size": "16px",
                        "font-weight": "normal",
                        "line-height": "20px"
                    });
            }

            // resizing retrieved tweets tab
            d3.select(".panel-body.rp-hd-info").style("height", d3.select(".panel-body.similarity-hd").style("height"));
            update_retrieved_tweets_shd_number(null, ATR.new_data_similarity_hd[current_hashtag].debates[Number(d.debate_number)].tweets.length, false);
        }

        function mouseover(d, i){
            if(d.type == "hashtag"){
                var count = 0;
                for(var j in ATR.new_data_similarity_hd[current_hashtag].debates){
                    count = count + ATR.new_data_similarity_hd[current_hashtag].debates[j].tweets.length;
                }

                tooltip.select(".tooltip-inner").style("visibility", "visible")
                tooltip.select(".tooltip-inner").html("<span style='font-weight:bold'>hashtag:</span> <span>" + d.name + "</span><br /><span style='font-weight:bold'>Tweets:</span> <span>" + count + "</span>")
                tooltip.select(".tooltip-inner").style("top", (event.pageY-tooltip.select(".tooltip-inner").style("height").split("px")[0]-60)+"px").style("left",(event.pageX-tooltip.select(".tooltip-inner").style("width").split("px")[0]/2)+"px");
                tooltip.select(".new-tooltip").style("visibility", "visible")
                tooltip.select(".new-tooltip").style("top", (event.pageY-tooltip.select(".new-tooltip").style("height").split("px")[0]-60)+"px").style("left",(event.pageX-tooltip.select(".new-tooltip").style("width").split("px")[0]/2)+"px");

                d3.select(this).style("fill", "gray")
            }
            else{
                tooltip.select(".tooltip-inner").style("visibility", "visible")
                tooltip.select(".tooltip-inner").html("<span style='font-weight:bold'>Debate:</span> <span>" + d.debate_name + "</span><br /><span style='font-weight:bold'>Tweets:</span> <span>" + ATR.new_data_similarity_hd[current_hashtag].debates[Number(d.debate_number)].tweets.length + "</span><br /><span style='font-weight:bold'>Similarity:</span> <span>" + ATR.new_data_similarity_hd[current_hashtag].debates[Number(d.debate_number)].val + "</span>")
                tooltip.select(".tooltip-inner").style("top", (event.pageY-tooltip.select(".tooltip-inner").style("height").split("px")[0]-60)+"px").style("left",(event.pageX-tooltip.select(".tooltip-inner").style("width").split("px")[0]/2)+"px");
                tooltip.select(".new-tooltip").style("visibility", "visible")
                tooltip.select(".new-tooltip").style("top", (event.pageY-tooltip.select(".new-tooltip").style("height").split("px")[0]-60)+"px").style("left",(event.pageX-tooltip.select(".new-tooltip").style("width").split("px")[0]/2)+"px");

                d3.select(this).attr("stroke", "gray");
                d3.select(this).attr("stroke-width", "3px")
            };
        }

        function mouseout(d) {
            if(d.type == "hashtag"){
                //tip_tweets.hide();
                d3.select(this).style("fill", "black")
            }
            else{
                //tip_debates.hide();
                d3.select(this).attr("stroke", "white");
                d3.select(this).attr("stroke-width", "1.5px");
            }
            tooltip.select(".new-tooltip").style("visibility", "hidden")
            tooltip.select(".tooltip-inner").style("visibility", "hidden")
        }
    }
}