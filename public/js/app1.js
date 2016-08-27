var ATRVis = function(){
    // data
    this.atrvis_data = null;
    this.labeling_requests_data = null;
    this.stopwords_data = null;
    this.vocab_distribution_data = null;
    this.disc_features_data = null;
    this.reply_chain_data = null;
    this.hashtag_deb_sim_data = null;

    // data for visualization
    this.data_for_vis_queue = [];
    this.data_for_vis_queue_hash = {};
    this.data_for_vis_queue_hash2 = {};
    this.max_for_vis = 150; //plus labeling requests...

    // for labeling request use
    this.max_by_type = 15;
    this.labeling_request_queue = [];
    this.labeling_request_curr = 0;
    this.data_to_label = null;
    this.pgX = 0;
    this.pgY = 0;
    this.class_selected = [];
    this.labeling_count = 0;

    // for ring visualization
    this.data_for_bundle = null;

    // for force layout visualization use
    this.data_for_force_layout = null;
    this.force_layout_links_limit = 5000;

    // for force and ring visualizations use
    this.tension = -1;
    this.max_val_threshold = 5;
    this.threshold = 1;
    this.main_threshold = 1;

    // for reply chain use
    this.rc_label_all = false;

    // for hashtag-debate similarity use
    this.shd_label_all = false;
    this.data_for_similarity_hd = null;
    this.new_data_similarity_hd = null;

    // statistics
    this.retrieved_tweets_count = 0;
    this.retrieved_tweets_before_count = 0;
    this.total_iter = 0;

    // debates and examples
    this.debates = {};
    this.classes_name = null;
    this.classes_color = {};

    // debate colors
    this.colorScale = d3.scale.category20();
    // [border-width=2, border-bottom-width=3, border-left-width=2, border-right-width=2, border-top-width=2]
    this.classes_style = ["2px", "1px", "15px", "1px", "1px"];
    // default colors
    this.color1 = "#DDD";
    this.color2 = "#F5F5F5";
    this.color3 = "#999999";
    this.color4 = "#BCBCBC";

    // for vocabulary distribution use
    this.keyword_threshold = 1.0;
    this.token_selected = null;
    this.data_for_chart = null;

    // sections controll
    this.back_to_section2 = false;
    this.breadcrumb_links = [
        "#home",
        "#second-section"
    ]

    this.breadcrumb_texts = [
        "Assigment",
        "More"
    ]

    // reply chain/tree controll
    this.labeling_request_rc_flag = false;

    // debates max height offset
    this.deb_max_h_offset = 240;
    // retrieved tweets max height offset
    this.rt_max_height_offset = 111;
    // chart max height offset
    this.c_max_height_offset = 210;
    // min height for visualizations
    this.min_height = 420;
    // min height for debates
    this.min_height_deb = 661;

    // resize controll
    this.resized = null;

    // userid
    this.user_id = null;

    // user feedback
    /*
        user_id: "user_id"
        tweets: [{"tweet_id_str": 123, "curr_deb": "meat inspection act", new_deb: "deb1", strategy": "equal score"}, ...]
        keywords: [{"keyword": "veterans", "curr_deb": "cbc"}, ...]
    */
    this.feedback = {"user_id": null, "tweets": [], "keywords": []};
};

// global
var function_threshold = null;
var function_lr_highlight_bundle = null;
var function_lr_highlight_force_layout = null;
var function_fe_bundle = null;
var function_fe_force_layout = null;
var arrow_flag = true;

/*********************************Generic Tooltip*********************************/
var tooltip = d3.select("body").append("div")
var arrow_tooltip = d3.select("body").append("div")

tooltip.append("div")
    .attr("class", "tooltip-inner")
    .style("position", "absolute")
    .style("z-index", "10")
    .style("visibility", "hidden")

tooltip.append("div")
        .style("position", "absolute")
        .style("z-index", "10")
        .style("visibility", "hidden")
        .attr("class", "new-tooltip")

arrow_tooltip.append("div")
    .attr("class", "tooltip-inner arrow")
    .style("position", "absolute")
    .style("z-index", "10")
    .style("visibility", "hidden")

arrow_tooltip.append("div")
        .style("position", "absolute")
        .style("z-index", "10")
        .style("visibility", "hidden")
        .attr("class", "new-tooltip arrow")
/*********************************/

//load of static data
ATRVis.prototype.load_data = function(tds,lr,stp,vd,df,rc,hds){
    var _this = this;
    // tweets and debates score
    $.getJSON(tds, function(data){
        _this.atrvis_data = data;
    })
    // labeling requests
    $.getJSON(lr, function(data){
        _this.labeling_requests_data = data;
    });
    // stopwords
    $.getJSON(stp, function(data){
        _this.stopwords_data = data;
    });
    // vocabulary distribution
    $.getJSON(vd, function(data){
        _this.vocab_distribution_data = data.VocabList;
    });
    // discriminative features
    $.getJSON(df, function(data){
        _this.disc_features_data = data;
    });
    // reply chain
    $.getJSON(rc, function(root){
        _this.reply_chain_data = root;
    });
    // hashtag-debate similarity
    $.getJSON(hds, function(data){
        _this.hashtag_deb_sim_data = data;

        // letting the similarity-hd data in the same format as debates_data
        for(var i in _this.hashtag_deb_sim_data.HashTags){
            //_this.hashtag_deb_sim_data.HashTags[i].scores.splice(3, 0, _this.hashtag_deb_sim_data.HashTags[i].scores.splice(5, 1)[0]);
            _this.hashtag_deb_sim_data.HashTags[i].scores.push({"debate": "none", "val":0.0000});
        }

        for(var i in _this.hashtag_deb_sim_data.HashTags){
            d3.select(".panel-body.similarity-hd-list").append("span")
                .attr("class", "similarity-hd-span")
                .attr("id", "shd"+i)
                .attr("visited", false)
                .attr("selected", false)
                .style({
                    "background-color": "white",
                    "position": "relative",
                    "height": "25px",
                    "cursor": "default",
                    "font-weight": "bold",
                    "color": "rgba(0,0,0,1)"
                })
                .on('click', function(d,i){
                    d3.selectAll(".similarity-hd-span").attr("selected", false);
                    d3.select(this).attr("selected", true);
                    d3.select(this).attr("visited", true);

                    // removing highlight from remaining tokens
                    d3.select(this.parentNode).selectAll("span")
                        .style({
                            "border-style": "none",
                            "border-width": "0px",
                            "background-color": "rgba(0,0,0,0)",
                        });

                    // highlight selected token
                    d3.select(this).style({
                        "font-weight": "bold",
                        "border-style": "solid",
                        "border-width": "2px",
                        "border-color": _this.color1,
                        "background-color": _this.color2
                    });

                    _this.draw_similarity_hd(false);

                    $(document.body).animate({
                        'scrollTop':   $(_this.breadcrumb_links[1]).offset().top
                    }, 'fast');
                })
            d3.select("#shd"+i).text("#"+_this.hashtag_deb_sim_data.HashTags[i].tagStr)
        }
        d3.select("#shd"+0).attr("visited", true);
        d3.select("#shd"+0).attr("selected", true);
        d3.select("#shd"+0).style({
            "font-weight": "bold",
            "border-style": "solid",
            "border-width": "2px",
            "border-color": _this.color1,
            "background-color": _this.color2
        })

        // showing number of classes
        d3.select(".panel.panel-default.similarity-hd div.panel-heading").append("p")
            .attr("class", "tweets-number")
            .style({
                "text-align": "center",
                "font-size": "1em",
                "font-weight": "300",
                "color": "white",
                "text-shadow": "-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black"
            }).text(d3.selectAll(".similarity-hd-span")[0].length+" HASHTAGS");
    });
};

ATRVis.prototype.load_hds = function(_this){
    // letting the similarity-hd data in the same format as debates_data
    for(var i in _this.hashtag_deb_sim_data.HashTags){
        //_this.hashtag_deb_sim_data.HashTags[i].scores.splice(3, 0, _this.hashtag_deb_sim_data.HashTags[i].scores.splice(5, 1)[0]);
        _this.hashtag_deb_sim_data.HashTags[i].scores.push({"debate": "none", "val":0.0000});
    }

    for(var i in _this.hashtag_deb_sim_data.HashTags){
        d3.select(".panel-body.similarity-hd-list").append("span")
            .attr("class", "similarity-hd-span")
            .attr("id", "shd"+i)
            .attr("visited", false)
            .attr("selected", false)
            .style({
                "background-color": "white",
                "position": "relative",
                "height": "25px",
                "cursor": "default",
                "font-weight": "bold",
                "color": "rgba(0,0,0,1)"
            })
            .on('click', function(d,i){
                d3.selectAll(".similarity-hd-span").attr("selected", false);
                d3.select(this).attr("selected", true);
                d3.select(this).attr("visited", true);

                // removing highlight from remaining tokens
                d3.select(this.parentNode).selectAll("span")
                    .style({
                        "border-style": "none",
                        "border-width": "0px",
                        "background-color": "rgba(0,0,0,0)",
                    });

                // highlight selected token
                d3.select(this).style({
                    "font-weight": "bold",
                    "border-style": "solid",
                    "border-width": "2px",
                    "border-color": _this.color1,
                    "background-color": _this.color2
                });

                _this.draw_similarity_hd(false);

                $(document.body).animate({
                    'scrollTop':   $(_this.breadcrumb_links[1]).offset().top
                }, 'fast');
            })
        d3.select("#shd"+i).text("#"+_this.hashtag_deb_sim_data.HashTags[i].tagStr)
    }
    d3.select("#shd"+0).attr("visited", true);
    d3.select("#shd"+0).attr("selected", true);
    d3.select("#shd"+0).style({
        "font-weight": "bold",
        "border-style": "solid",
        "border-width": "2px",
        "border-color": _this.color1,
        "background-color": _this.color2
    })

    // showing number of classes
    d3.select(".panel.panel-default.similarity-hd div.panel-heading").append("p")
        .attr("class", "tweets-number")
        .style({
            "text-align": "center",
            "font-size": "1em",
            "font-weight": "300",
            "color": "white",
            "text-shadow": "-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black"
        }).text(d3.selectAll(".similarity-hd-span")[0].length+" HASHTAGS");
}

// create list of debates and prepare data for visualizations/requests
ATRVis.prototype.process_atrvis_lr = function(){

    // for statistics
    for(var i in this.atrvis_data.dataset){
        if(this.atrvis_data.dataset[i].true_label != "non-retrieved")
            this.retrieved_tweets_count = this.retrieved_tweets_count + 1;
    }
    d3.select(".retrieval-info").text(this.retrieved_tweets_count);
    if(this.retrieved_tweets_before_count == 0)
        this.retrieved_tweets_before_count = this.retrieved_tweets_count;

    // list of debates
    for(var i in this.atrvis_data.dataset[0].scores){
        this.debates[this.atrvis_data.dataset[0].scores[i].debate] = [];
    }

    // process labeling requests
    var labeling_request_queue_aux = [];
    var count = 0;
    for(var i in this.atrvis_data.dataset){
        if(this.labeling_requests_data.indexOf(this.atrvis_data.dataset[i].id) != -1){
            count = count + 1;
            this.data_for_vis_queue.push(Number(i));
            if(this.atrvis_data.dataset[i].status == "labeling-request"){
                labeling_request_queue_aux.push(Number(i));
                this.atrvis_data.dataset[i].labeling = true;
            }
        }
    }
    var count2 = 0;
    for(var i in labeling_request_queue_aux)
        if(this.atrvis_data.dataset[labeling_request_queue_aux[i]]["request-type"] == "Equal Score"){
            this.labeling_request_queue.push(labeling_request_queue_aux[i]);
            count2 = count2 + 1;
            if(count2 == this.max_by_type)
                break;
        }
    count2 = 0;
    for(var i in labeling_request_queue_aux)
        if(this.atrvis_data.dataset[labeling_request_queue_aux[i]]["request-type"] == "Near Duplicate"){
            this.labeling_request_queue.push(labeling_request_queue_aux[i]);
            count2 = count2 + 1;
            if(count2 == this.max_by_type)
                break;
        }
    count2 = 0;
    for(var i in labeling_request_queue_aux)
        if(this.atrvis_data.dataset[labeling_request_queue_aux[i]]["request-type"] == "Reply Chain"){
            this.labeling_request_queue.push(labeling_request_queue_aux[i]);
            count2 = count2 + 1;
            if(count2 == this.max_by_type)
                break;
        }
    count2 = 0;
    for(var i in labeling_request_queue_aux)
        if(this.atrvis_data.dataset[labeling_request_queue_aux[i]]["request-type"] == "HashTag"){
            this.labeling_request_queue.push(labeling_request_queue_aux[i]);
            count2 = count2 + 1;
            if(count2 == this.max_by_type)
                break;
        }
    this.labeling_request_curr = this.labeling_request_queue[0];

    // data for visualization
    var total = count;
    for(var i in this.atrvis_data.dataset){
        if(total < this.max_for_vis && this.data_for_vis_queue.indexOf(Number(i)) == -1){
            total = total + 1;
            this.data_for_vis_queue.push(Number(i));
            this.atrvis_data.dataset[Number(i)].labeling = false;
        }
    }

    // show list of debates
    this.update_debate_examples();

    var count_classes = 1;
    for(var key in this.debates){
        d3.select(".list-group.debates")
            .append("li").attr("class", "list-group-item").attr("id", "cl"+count_classes).style({
                "border-color": this.colorScale(count_classes-1),
                "border-width": this.classes_style[0],
                "border-bottom-width": this.classes_style[1],
                "border-left-width": this.classes_style[2],
                "border-right-width": this.classes_style[3],
                "border-top-width": this.classes_style[4]
            })
            .style("margin-top", function(d,i){
                if(key.toLowerCase() == "none"){
                    return "30px";
                }
                else
                    return "none";
            })
            .data([{classe: key}])
            .append("h4").attr("class", "list-group-item-heading")
            .append("p").append("strong").text(key.toUpperCase())
            .append("div").style("position", "relative").style({
                "font-size": "0.6em",
                "font-weight": "400",
                "color": "black",
                "text-shadow": "-1px 0 #DDD, 0 1px #DDD, 1px 0 #DDD, 0 -1px #DDD"
            });
        d3.select(".list-group.debates li#cl"+count_classes)
            .append("p").attr("class", "list-group-item-text");
        count_classes = count_classes + 1;
    }

    // show example on mouse hover
    var _this = this;
    d3.select(".list-group.debates").selectAll(".list-group-item").on("mouseover", function(d,i){
        var classe_name = d3.select(".list-group-item#cl"+(i+1)).select(".list-group-item-heading p strong")[0][0].firstChild.data.toLowerCase();

        if(_this.debates[classe_name].length > 0){
            d3.select(".list-group-item#cl"+(i+1)).select(".list-group-item-text").style({
                "border-style": "solid",
                "border-width": "1px",
                "border-color": _this.color1
            }).text(_this.debates[classe_name][0]);
        }else{
            d3.select(".list-group-item#cl"+(i+1)).select(".list-group-item-text").style({
                "border-style": "solid",
                "border-width": "1px",
                "border-color": _this.color1
            }).text("no tweets associated...");
        }
    });
    // hide example on mouse out
    d3.select(".list-group.debates").selectAll(".list-group-item").on("mouseout", function(d,i){
        d3.select(".list-group-item#cl"+(i+1)).select(".list-group-item-text").style({
                "border-style": "none"
            }).text("");
        d3.select(this).style({
            "border-width": _this.classes_style[0],
            "border-bottom-width": _this.classes_style[1],
            "border-left-width": _this.classes_style[2],
            "border-right-width": _this.classes_style[3]
        })
        .style("border-top-width", function(d,i){
            if(d.classe.toLowerCase() == "none"){
                return _this.classes_style[4];
            }
            else
                return _this.classes_style[4];
        });
    });
    // show number of classes
    d3.select(".col-xs-3 div.classes-list div.panel.panel-default.debates div.panel-heading p").remove();
    d3.select(".col-xs-3 div.classes-list div.panel.panel-default.debates div.panel-heading").append("p").style({
        "text-align": "center",
        "font-size": "1em",
        "font-weight": "300",
        "color": "white",
        "text-shadow": "-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black"
    }).text((count_classes-1)+" CLASSES");
}

ATRVis.prototype.update_debate_examples = function(){
    var count_classes = 0;
    var keys = Object.keys(this.debates)
    for(var i in keys){
        this.debates[keys[i]] = [];
    }
    for(var i in this.atrvis_data.dataset){
        if(!this.atrvis_data.dataset[i].labeling){
            var max = 0.0;
            var idx_classe = -1;
            for(var j in this.atrvis_data.dataset[i].scores){
                var obj = this.atrvis_data.dataset[i].scores[j];
                if(obj.val >= max){
                    max = obj.val;
                    idx_classe = j;
                }
            }
            // add tweet example
            var debate_name = this.atrvis_data.dataset[i].scores[idx_classe].debate;
            if(this.debates[debate_name].length == 0 && max != 0.0){
                this.debates[debate_name].push(this.atrvis_data.dataset[i].text);
                count_classes = count_classes + 1
            }else{
                if(count_classes == this.debates.length){
                    break;
                }
            }
        }
    }
}

ATRVis.prototype.set_classes_name_and_color = function(){
    if(!this.classes_name){
        this.classes_name = [];
        this.classes_color = {};

        keys = Object.keys(this.debates);
        for(i=0; i<keys.length; i++){
            new_name = keys[i];
            this.classes_name.push(new_name);
            this.classes_color[new_name] = i;
        }
        this.classes_name.push("non_retrieved");
        this.classes_color["non_retrieved"] = -1;
    }
}

ATRVis.prototype.labeling_request = function(){
    d3.select(".request-area div.panel-body div.done").remove();

    this.update_labeling_request_number();

    if(this.labeling_request_curr != -1){
        this.data_to_label = this.atrvis_data.dataset[this.labeling_request_curr];

        // spliting text to allow selection of tokens
        var tokens = this.data_to_label.text.split(" ");

        d3.select(".col-xs-4 div.request-area div.panel-body")
            .append("div").attr("class", "labeling-request").style("opacity", "0")
            .append("blockquote").attr("class", "twitter-tweet").attr("lang", "en")
            .append("p").attr("lang", "en").attr("dir", "ltr").attr("class", "text-for-selection");
        
        d3.select(".labeling-request")
            .transition()
            .duration(1000)
            .style("opacity", "1");

        // creating a span for each token
        var _this = this;
        d3.select("p.text-for-selection").selectAll("span")
            .data(tokens)
            .enter().append("span")
            .html(function(d){ return d+" "; })
            .style("color", function(d){
                d = d.replace(/[.,-\/#!$@%\^&\*;:{}=\-_`~()]/g,"");
                d = d.replace(/^\s+|\s+$/g, '');
                el = _this.token_search(d.toLowerCase());
                if(el){
                    //deb max
                    var max = 0.0;
                    var deb = -1;
                    var deb_name = "";
                    for(i in el.scores){
                        if(el.scores[i].val > max && el.scores[i].val >= _this.keyword_threshold){
                            max = el.scores[i].val;
                            deb = i;
                            deb_name = el.scores[i].debate;
                        }
                    }
                    if(deb != -1 && deb_name.toLowerCase() != "none"){
                        return _this.colorScale(_this.classes_name.indexOf(deb_name));
                    }
                    else{
                        return "none";
                    }
                }else{
                    return "none";
                }
            })
            .on("click", this.draw_chart);

        d3.select(".col-xs-4 div.request-area div.labeling-request blockquote")
            .append("b").attr("class","twitter-info").text("— "+this.data_to_label.fullname+" (@"+this.data_to_label.username+") "+this.data_to_label.created_at);

        d3.select(".col-xs-4 div.request-area div.labeling-request blockquote")
            .append("p").attr("dir","rtl").append("strong").style({
                "border-style": "outset",
                "border-width": "1px"
            }).text("DRAG TO LABEL")

        d3.select(".col-xs-4 div.request-area div.labeling-request blockquote").append("p")
            .attr("dir","rtl")
            .style("font-size", "14px")
            .text("(or double click to skip)")

        d3.select(".col-xs-4 div.request-area div.labeling-request blockquote")
            .append("a")
                .attr({
                    "class": "glyphicon glyphicon-info-sign",
                    "aria-hidden": "true"
                })
                .style("font-size", "20px")
                .on('mouseover', function(d){
                    tooltip.select(".tooltip-inner").style("visibility", "visible")
                    tooltip.select(".tooltip-inner").html("<span style='font-weight:bold'>Strategy: </span><span>"+ _this.atrvis_data.dataset[_this.labeling_request_curr]["request-type"] +"</span>")
                    tooltip.select(".tooltip-inner").style("top", (event.pageY-tooltip.select(".tooltip-inner").style("height").split("px")[0]-40)+"px").style("left",(event.pageX-tooltip.select(".tooltip-inner").style("width").split("px")[0]/2)+"px");
                    tooltip.select(".new-tooltip").style("visibility", "visible")
                    tooltip.select(".new-tooltip").style("top", (event.pageY-tooltip.select(".new-tooltip").style("height").split("px")[0]-40)+"px").style("left",(event.pageX-tooltip.select(".new-tooltip").style("width").split("px")[0]/2)+"px");
                })
                .on('mouseout', function(d){
                    tooltip.select(".new-tooltip").style("visibility", "hidden")
                    tooltip.select(".tooltip-inner").style("visibility", "hidden")
                })

        d3.select(".request-area div.panel-body").style("height",d3.select(".labeling-request").style("height"));
    }else{
        console.log("Done");
        d3.select(".request-area div.panel-body").style("height","240px");

        // draw apply button
        d3.select(".request-area div.panel-body")
            .append("div")
            .attr("class", "done")
                .style({
                    "height": "200px",
                    "line-height": "200px",
                    "text-align": "center"
                })
                .append("button")
                    .attr({
                        "class": "btn btn-default",
                        "aria-label": "Center Align",
                        "vertical-align": "middle"
                    })
                    .text("APPLY?")
                    .on('click', this.done);
    }
}

ATRVis.prototype.done = function(){
    d3.select(".request-area div.panel-body div.done").remove();

    var done = d3.select(".request-area div.panel-body").append("div")
        .attr("class", "done")
        .style({
            "font-size": "24px",
            "line-height": "64px"
        })
        .html("Thank you for helping!")
        //.html("All catch up!")
        .append("div")
            .style({
                "font-size": "16px",
                "line-height": "1.42857143"
            })
            .append("p")
                .html("<strong>RETRIEVED TWEETS</strong>")
                .append("table")
                    .attr("class", "table table-hover")
                    .append("tbody")
    done.append("tr")
        .append("td")
            .html("<strong>BEFORE</strong>");
    done.select("tr").append("td")
        .html(ATR.retrieved_tweets_before_count)
        .append("span")
            .attr({
                "class": "glyphicon glyphicon-arrow-up",
                "aria-hidden": "true"
            })
            .style("visibility", "hidden")
    done.select("tr").append("td")
    done.append("tr")
        .attr("class", "second-tr")
            .append("td")
                .html("<strong>AFTER</strong>");

    done.select("tr.second-tr").append("td")
        .html(ATR.retrieved_tweets_count)
        .append("span")
            .attr("class", function(d){
                if(ATR.retrieved_tweets_before_count < ATR.retrieved_tweets_count){
                    return "glyphicon glyphicon-arrow-up";
                }else{
                    return "glyphicon glyphicon-arrow-down"
                }
            })
            .attr("aria-hidden", "true")
            .style("color", function(d){
                if(ATR.retrieved_tweets_before_count < ATR.retrieved_tweets_count){
                    return "green";
                }else{
                    return "red";
                }
            })
    done.select("tr.second-tr").append("td")
    d3.select(".request-area div.panel-body div.done").append("div")
        .style("color", function(d){
            if(ATR.retrieved_tweets_before_count < ATR.retrieved_tweets_count){
                return "green";
            }else{
                return "red";
            }
        })
        .html(function(d){
            if(ATR.retrieved_tweets_before_count < ATR.retrieved_tweets_count){
                return "<strong>+ "+(ATR.retrieved_tweets_count - ATR.retrieved_tweets_before_count)+"</strong>";
            }else{
                return "<strong>- "+(ATR.retrieved_tweets_before_count - ATR.retrieved_tweets_count)+"</strong>";
            }
        })

    d3.select(".request-area div.panel-body").style("height","270px");
    ATR.apply();
}

ATRVis.prototype.token_search = function(token){
    for(i in this.vocab_distribution_data){
        if(token == this.vocab_distribution_data[i].token){
            return this.vocab_distribution_data[i];
        }
    }
    return null;
}

ATRVis.prototype.update_labeling_request_number = function(){
    if(this.labeling_request_curr != -1){
        if(this.atrvis_data.dataset[this.labeling_request_curr].labeling){
            d3.select(".request-area div.panel-heading p").remove();
            // showing number of classes
            d3.select(".request-area div.panel-heading").append("p").style({
                "text-align": "center",
                "font-size": "1em",
                "font-weight": "300",
                "color": "white",
                "text-shadow": "-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black"
            }).text((this.labeling_request_queue.length)+" REMAINING");
        }
    }else{
        d3.select(".request-area div.panel-heading p").remove();
        // showing number of classes
        d3.select(".request-area div.panel-heading").append("p").style({
            "text-align": "center",
            "font-size": "1em",
            "font-weight": "300",
            "color": "white",
            "text-shadow": "-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black"
        }).text("0 REMAINING");
    }
}

ATRVis.prototype.drag_for_labeling_request = function(){
    this.pgX = 0;
    this.pgY = 0;

    var drag = d3.behavior.drag()
        .origin(function(d){ return d; })
        .on("drag", dragmove)
        .on("dragend", this.dragend);

    // modify div to allow drag
    d3.select(".labeling-request").data([{x: 0, y: 0}]);
    d3.select(".labeling-request").style({
        position: "absolute",
        left: function(d, i){ return d.x + "px"; },
        top: function(d, i) { return d.y + "px"; }
    });

    d3.select(".labeling-request")
        .call(drag);

    // show most probable debate
    d3.select(".labeling-request").on('dblclick', this.labeling_request_skip);

    // offset for mouse's relative position
    var _this = this;
    $(".twitter-tweet").mousedown(function(e){
        _this.pgX = e.pageX - $(".labeling-request").offset().left;
        _this.pgY = e.pageY - $(".labeling-request").offset().top;
    });

    function dragmove(d) {
        // this is the reason for the lag...
        d3.select(".labeling-request").style("width", d3.select(this).style("width"));

        _this.check_boundaries('.labeling-request')

        d.x = d3.event.x;
        d.y = d3.event.y;
        leftVal = d.x + "px";
        topVal = d.y + "px";
        d3.select(this)
            .style({left: leftVal, top: topVal});
    }
}

ATRVis.prototype.check_boundaries = function(el){
    // div list of class boundaries
    var ltop = Number($('.list-group.debates').offset().top),
        lleft = Number($('.list-group.debates').offset().left);

    // div list of class limits
    var ltop_limit = ltop + Number(d3.select(".list-group.debates").style("height").split("px")[0]),
        lleft_limit = lleft + Number(d3.select(".list-group.debates").style("width").split("px")[0]);

    // mouse's relative position + offset
    var mouse_pos_top = Number($(el).offset().top + this.pgY),
        mouse_pos_left = Number($(el).offset().left + this.pgX);

    // highlight list
    d3.select(".panel.panel-default.debates").style({
        "border-width": "5px"
    });

    // verify only in the case the mouse is within list of class boundaries
    if(mouse_pos_left >= lleft && mouse_pos_left <= lleft_limit && mouse_pos_top >= ltop && mouse_pos_top <= ltop_limit){
        // remove list highlight
        d3.select(".panel.panel-default.debates").style({
            "border-width": "1px"
        });

        var total_classes = d3.select(".list-group.debates").selectAll(".list-group-item")[0].length;

        this.class_selected = [];

        for(i=0; i<total_classes; i++){
            this.class_selected.push(false);
        }

        var _this = this;
        d3.select(".list-group.debates").selectAll(".list-group-item").each(function(d,i){

            // div class's limits
            var right_limit = Number(d3.select(this).style("width").split("px")[0]) + Number($(this).offset().left) - 1,
                bottom_limit = Number(d3.select(this).style("height").split("px")[0]) + Number($(this).offset().top) - 1;

            // div class's boundaries
            var top = Number($(this).offset().top)+1,
                left = Number($(this).offset().left)+1;

            // highlight classe which mouse is over
            if(mouse_pos_top >= top && mouse_pos_top <= bottom_limit && mouse_pos_left >= left && mouse_pos_left <= right_limit){
                d3.select(this).style({
                    "background-color": _this.color1
                });
                _this.class_selected[i] = true;
            }else{
                d3.select(this).style({
                    "border-width": _this.classes_style[0],
                    "border-bottom-width": _this.classes_style[1],
                    "border-left-width": _this.classes_style[2],
                    "border-right-width": _this.classes_style[3],
                    "border-top-width": _this.classes_style[4],
                    "background-color": "white"
                });
                _this.class_selected[i] = false;
            }
        })
    }else{
        // prevent loses due mouse's speed
        this.clearselection();
    }
}

ATRVis.prototype.clearselection = function(){
    var _this = this;
    d3.select(".list-group.debates").selectAll(".list-group-item").each(function(d,i){
        d3.select(this).style({
                "border-width": _this.classes_style[0],
                "border-bottom-width": _this.classes_style[1],
                "border-left-width": _this.classes_style[2],
                "border-right-width": _this.classes_style[3],
                "border-top-width": _this.classes_style[4],
                "background-color": "white"
            })
    })
    for(i in this.class_selected){
        this.class_selected[i] = false;
    }
}

ATRVis.prototype.labeling_request_skip = function(){
    ATR.back_to_section2 = false;
    var idx = ATR.labeling_request_queue.indexOf(ATR.labeling_request_curr);
    var el = ATR.labeling_request_queue.splice(idx, 1)[0];
    ATR.labeling_request_queue.push(el);
    ATR.labeling_request_curr = ATR.labeling_request_queue[0];
    ATR.update_labeling_request();
    ATR.resize(false,null,null,true);
}

ATRVis.prototype.dragend = function(d){
    d.x = 0;
    d.y = 0;

    // remove list highlight
    d3.select(".panel.panel-default.debates").style({
        "border-width": "1px",
    });

    // verify if some classe has been selected
    var flag = false;
    for(var i in ATR.class_selected){
        if(ATR.class_selected[i] == true){
            ATR.labeling_count = ATR.labeling_count + 1;

            d3.select(".navbar-brand.history").text("HISTORY ("+ATR.labeling_count+")");
            d3.select(".pagination.list-inline.iter li#iterc a").text(ATR.labeling_count);
            d3.select(".pagination.list-inline.iter li#iterp").attr("class", "")
            if(ATR.atrvis_data.dataset[ATR.labeling_request_curr].true_label == "non-retrieved"){
                ATR.retrieved_tweets_count = ATR.retrieved_tweets_count + 1;
                d3.select(".retrieval-info").text(ATR.retrieved_tweets_count);
            }

            // not a labeling request anymore
            ATR.atrvis_data.dataset[ATR.labeling_request_curr].labeling = false;
            ATR.labeling_request_queue.splice(ATR.labeling_request_queue.indexOf(ATR.labeling_request_curr), 1);
            var atrvis_data_flag = false;
            // update tweet class
            var id = ATR.atrvis_data.dataset[ATR.labeling_request_curr].id;
            var res = ATR.get_most_probable_debate(ATR.atrvis_data.dataset[ATR.labeling_request_curr]);

            // save user feedback
            var strategy = "selected by user";
            if(ATR.atrvis_data.dataset[ATR.labeling_request_curr]["request-type"] != "")
                strategy = ATR.atrvis_data.dataset[ATR.labeling_request_curr]["request-type"];
            ATR.feedback.tweets.push({"tweet_id_str": id, "curr_deb": ATR.classes_name[i], "strategy": strategy});

            ATR.atrvis_data.dataset[ATR.labeling_request_curr].true_label = ATR.classes_name[i]

            if(i != res[0]){
                ATR.atrvis_data.dataset[ATR.labeling_request_curr].scores[i].val = res[1] + 0.5;
                atrvis_data_flag = true;
            }
            // update entire reply chain
            var el = this;
            if(ATR.labeling_request_rc_flag){
                var inputs = [i, id, el, atrvis_data_flag]
                $('#myModal').modal()
                $('#myModal').modal({ keyboard: false })
                $('#myModal').modal('show');
                $('#myModal').on('hidden.bs.modal', function () {
                    ATR.dragend_labeling(inputs[0],inputs[1],inputs[2],inputs[3]);
                })
            }else{
                ATR.dragend_labeling(i,id,el,atrvis_data_flag);
            }
        }
    }
    if(!flag){
        d3.select(this)
            .transition()
            .duration(0)
            .style({left: 0, top: 0});
    }
}

ATRVis.prototype.dragend_labeling = function(i,id,el,atrvis_data_flag){
    if(this.labeling_request_rc_flag && this.rc_label_all){
        var ids = this.get_reply_chain_ids();
        for(j in this.atrvis_data.dataset){
            if(ids.indexOf(this.atrvis_data.dataset[j].id) > -1){

                if(this.atrvis_data.dataset[Number(j)].true_label == "non-retrieved"){
                    this.retrieved_tweets_count = this.retrieved_tweets_count + 1;
                    d3.select(".retrieval-info").text(this.retrieved_tweets_count);
                }

                // remove from labeling request queue if necessary
                this.atrvis_data.dataset[j].labeling = false;
                var idx = this.labeling_request_queue.indexOf(this.atrvis_data.dataset[j].id);
                if(idx > -1){
                    this.labeling_request_queue.splice(idx, 1);
                }
                // res[deb, max]
                var res = this.get_most_probable_debate(this.atrvis_data.dataset[j]);
                if(Number(res[0]) != Number(i)){
                    atrvis_data_flag = true;
                    this.atrvis_data.dataset[j].scores[i].val = res[1] + 0.5;
                    this.atrvis_data.dataset[Number(j)].true_label = this.classes_name[Number(i)]
                    if(this.data_for_vis_queue.indexOf(Number(j)) == -1){
                        this.data_for_vis_queue.push(Number(j));
                    }
                }
            }
        }
        id = ids;
    }

    if(this.labeling_request_queue.length > 0)
        this.labeling_request_curr = this.labeling_request_queue[0];
    else
        this.labeling_request_curr = -1;
    this.update_keyword_distribution(el);
    this.update_labeling_request();
    console.log("tweet associated!");
    this.update_bars();
    // redraw bundle
    if(d3.select(".panel-body.bundle svg")[0][0]){
        d3.select("svg.bundle").remove();
        this.draw_bundle(atrvis_data_flag);
    }
    // redraw force layout
    if(d3.select(".panel-body.force-layout svg")[0][0]){
        d3.select("svg.force-layout").remove();
        this.draw_force_layout(atrvis_data_flag);
    }
    // redraw keyword distribution chart
    if(d3.select(".panel-body.chart svg")[0][0]){
        d3.select("svg.bar-chart").remove();
        this.draw_chart(null);
    }
    // redraw replay chain
    if(d3.select(".panel-body.reply-chain svg")[0][0]){
        d3.select("svg.reply-chain").remove();
        this.draw_reply_chain(atrvis_data_flag, id, i);
    }
    // redraw similarity hashtag-debate
    if(d3.select(".panel-body.similarity-hd svg")[0][0]){
        d3.select("svg.similarity-hd").remove();
        this.draw_similarity_hd(atrvis_data_flag);
    }
    // update debate examples
    this.update_debate_examples();
    atrvis_data_flag = false;
    // back to section2
    if(this.back_to_section2){
        this.back_to_section2 = false;
        this.labeling_request_rc_flag = false;
        $(document.body).animate({
            'scrollTop':   $('#second-section').offset().top
        }, 'fast');
    }
    $('#myModal').unbind('hidden.bs.modal');
}

ATRVis.prototype.get_most_probable_debate = function(t){
    if(t == undefined){
        return [-1, 0.0];
    }else{
        var max = 0.0;
        var deb = -1;
        for(var i in t.scores){
            if(t.scores[i].val > max){
                max = t.scores[i].val;
                deb = i;
            }
        }
        return [deb, max];
    }
}

ATRVis.prototype.update_bars = function(){
    // - retrieving data from 'data_to_label'
    var data_bar = []
    for(i in this.data_to_label.scores){
        data_bar.push(this.data_to_label.scores[i].val);
    }
    // scaling bars' width
    var bar_max_width = Number(d3.select(".list-group.debates li.list-group-item p.list-group-item-text").style("width").split("px")[0]);

    var scale = d3.scale.linear()
        .domain([0, d3.max(data_bar)])
        .range([0, Number(bar_max_width)]);

    var _this = this;
    d3.select(".list-group.debates").selectAll(".list-group-item").each(function(d,i){
        d3.select(this).select(".list-group-item-heading p div").html("");
        d3.select(this).select(".list-group-item-heading p div").append("div")
            .style("width", function(d){ return scale(data_bar[i]) + "px"; })
            .style({
                "font": "10px sans-serif",
                "padding": "3px",
                "margin": "1px",
                "color": "white",
                "height": "12px",
                "font-weight": "400"
            })
            .style("background-color", _this.colorScale(i))
        d3.select(this).select(".list-group-item-heading p div").append("div").style({
            "width": "100%",
            "text-align": "right",
            "position": "absolute",
            "top": "0px",
            "left": "0px"
            })
            .text(function(){ return Math.round(Number(data_bar[i]) * 100) / 100 });
    })
};

ATRVis.prototype.get_data_to_label_informations = function(){
    if(this.labeling_request_curr == -1){
        return [-1, "", null];
    }else{
        var max = 0.0;
        var deb = -1;
        var debate_name = "";
        for(i in this.data_to_label.scores){
            if(this.data_to_label.scores[i].val > max){
                max = this.data_to_label.scores[i].val;
                deb = i;
                debate_name = this.data_to_label.scores[i].debate;
            }
        }
        d = {"classe": debate_name};
        return [deb, debate_name, d];
    }
}

ATRVis.prototype.show_discriminative_keyword = function(key){
    key = key.toLowerCase();
    // cleaning prevous number
    d3.select(".panel.panel-default.discriminative-features div.panel-heading p").remove();

    // clean discriminative keywords
    d3.selectAll(".discriminative-span").remove();

    if(key == "none")
        return;

    var max = d3.max(this.disc_features_data[key], function(d) { return +d[Object.keys(d)]} );
    var min = d3.min(this.disc_features_data[key], function(d) { return +d[Object.keys(d)]} );

    if(min == max)
        min = 0;

    x = d3.scale.linear()
        .domain([min, max])
        .range([40, 120]);

    var sortable = [];
    for (var i in this.disc_features_data[key]){
        keyword = Object.keys(this.disc_features_data[key][i]);
        value = this.disc_features_data[key][i][keyword];
        sortable.push([String(keyword), value])
    }
    sortable.sort(function(a, b) {return b[1] - a[1]})

    this.update_discriminative_keyword_number(sortable.length, key);

    for(i in sortable){
        keyword = sortable[i][0];
        value = sortable[i][1];
        type = "keyword";
        if(String(keyword).substr(0,1) == '#')
            type = "hashtag"
        else if(String(keyword).substr(0,4) == 'http')
            type = "url"
        d3.select(".panel-body.df").append("span")
            .attr("class", "discriminative-span")
            .attr("id", "disc"+i)
            .attr("data-html", "true")
            .attr("deb", key)
            .attr("title", "<span style='font-weight:bold'>Type:</span> <span>" + type + "</span><br /><span style='font-weight:bold'>Feature:</span> <span>" + keyword + "</span><br /><span style='font-weight:bold'>Weight:</span> <span>" + value + "</span>")
            .style({
                "width": String(x(value))+"px",
                "background-color": "white",
                "position": "relative",
                "height": "25px",
                "cursor": "default"
            })
            .data([{value: value, keyword: keyword}]);
        if(type != "url")
            d3.select("#disc"+i).text(keyword)
        else
            d3.select("#disc"+i).append("a").style({
                    "text-decoration": "none",
                })
                .attr("href", keyword)
                .attr("target", "_blank")
                .text(keyword)
        $("#disc"+i).tooltip();
    }

    var _this = this;
    d3.selectAll(".discriminative-span").each(function(d,i){
        d3.select(this).append("div")
            .style({
                "background-color": _this.colorScale(_this.classes_color[key]),
                "width": "100%",
                "color": "white",
                "height": "4px"
            })
    })

    d3.selectAll(".discriminative-span").on('mousedown', function(d){
        d3.select(this).style({left: 0, top: 0});
        d3.select(this).data([{x: d3.mouse(this.parentNode)[0], y: d3.mouse(this.parentNode)[1]+2*38}]);
        $(this).tooltip('hide');
        pgX = d3.event.pageX - $(this).offset().left + 4;
        pgY = d3.event.pageY - $(this).offset().top + 8;
    })

    d3.selectAll(".discriminative-span").each(function(d){
        _this.drag_disc_features(this);
    })

    $(".discriminative-span").on('click', function(d){
        $(this).tooltip('hide');
    })
}

ATRVis.prototype.update_discriminative_keyword_number = function(qtd, key){
    key = key.toLowerCase();
    if(key != "none"){
        // showing number of classes
        d3.select(".panel.panel-default.discriminative-features div.panel-heading").append("p").style({
            "text-align": "center",
            "font-size": "1em",
            "font-weight": "300",
            "color": "white",
            "text-shadow": "-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black"
        }).text(qtd+" FEATURES");
    }
}

ATRVis.prototype.drag_disc_features = function(el){
    var drag_df = d3.behavior.drag()
        .origin(function(d){ return d; })
        .on("drag", dragmove_df)
        .on("dragend", dragend_df);

    d3.select(el)
        .call(drag_df);

    var _this = this;
    function dragmove_df(d){
        $(this).tooltip('hide');

        _this.check_boundaries(this);

        d3.select(this)
            .style({
                left: (d3.event.x)+"px", 
                top: (d3.event.y)+"px",
                position: "absolute",
                "z-index": 500,
                "background-color": "rgba(255, 255, 255, 0.5)"
            });
    }

    function dragend_df(){
        // remove list highlight
        d3.select(".panel.panel-default.debates").style({
            "border-width": "1px",
        });

        for(var i in _this.class_selected){
            if(_this.class_selected[i] == true && _this.classes_name[i] != d3.select(this).attr("deb")){
                // save user feedback
                ATR.feedback.keywords.push({"keyword": d3.select(this).text(), "curr_deb": _this.classes_name[i]});

                var debates_data_flag = false;
                // update discriminative feature debate
                _this.update_discriminative_features(d3.select(this).text(), _this.classes_name[i], d3.select(this).attr("deb"));
                _this.clearselection();
                d3.select(this).remove();
                _this.show_discriminative_keyword(d3.select(this).attr("deb"))
            }
        }

        d3.select(this).style({
            position: "relative",
            "z-index": "auto",
            "background-color": "rgba(255, 255, 255, 1)"
        })
        d3.select(this)
            .transition()
            .duration(0)
            .style({left: 0, top: 0});
    }
}

ATRVis.prototype.update_discriminative_features = function(feature, new_debate, old_debate){
    if(new_debate == old_debate){
        return;
    }else{
        if(old_debate != -1){
            var obj = null;
            for(i in this.disc_features_data[old_debate]){
                if(this.disc_features_data[old_debate][i][feature]){
                    obj = this.disc_features_data[old_debate].splice(i,1);
                }
            }
            this.disc_features_data[new_debate].push(obj[0]);
        }else{
            var obj = {};
            obj[feature] = 1.5;
            this.disc_features_data[new_debate].push(obj);
        }
    }
}

ATRVis.prototype.retrieved_tweets = function(el,d,i){
    // cleaning number of tweets
    d3.select(".panel.panel-default.retrieved-tweets div.panel-heading p.tweets-number").remove();
    // resize panel
    var offset = window.innerHeight-d3.select(".panel.panel-default.discriminative-features").style("height").split("px")[0]-this.deb_max_h_offset;
    if(offset-this.rt_max_height_offset < this.min_height)
        d3.select(".panel-body.retrieved-tweets").style("height",(this.min_height)+"px");
    else
        d3.select(".panel-body.retrieved-tweets").style("height",(offset-this.rt_max_height_offset)+"px");
    // cleaning previous list
    d3.select(".list-group.retrieved-tweets").selectAll(".list-group-item").remove();
    d3.select(".panel.panel-default.retrieved-tweets div.panel-heading p.rt-classe").remove();

    var classe_name = d3.select(el).select(".list-group-item-heading p strong")[0][0].firstChild.data.toLowerCase();
    // current classe: classe_name
    var classe = [];
    for(var idxI in this.atrvis_data.dataset){
        if(!this.atrvis_data.dataset[idxI].labeling){
            max_value = 0.0;
            debate_name = "";
            for(idxJ in this.atrvis_data.dataset[idxI].scores){
                if(Number(this.atrvis_data.dataset[idxI].scores[idxJ].val) > max_value){
                    max_value = Number(this.atrvis_data.dataset[idxI].scores[idxJ].val);
                    debate_name = this.atrvis_data.dataset[idxI].scores[idxJ].debate;
                }
            }
            if(debate_name == classe_name && max_value >= 1.0){
                classe.push([this.atrvis_data.dataset[idxI], idxI]);
            }
        }
    }

    var _this = this;
    if(classe.length > 0){
        for(var idxI in classe){
            d3.select(".list-group.retrieved-tweets")
                .append("li").attr("class", "list-group-item retrieved-tweets").attr("id", "cl"+idxI).style({
                    "border-color": this.colorScale(i)
                })
                .attr("d", function(d){
                    return classe[idxI][1];
                })
                .on('dblclick', function(d){
                    _this.back_to_section2 = false;
                    _this.labeling_request_rc_flag = false;
                    _this.data_for_bundle = null;
                    _this.data_for_force_layout = null;
                    _this.change_labeling_request(Number(d3.select(this).attr("d")));
                })
                .append("p").attr("class", "list-group-item-text").text(classe[idxI][0].text)
                .style({
                    "font-size": "16px",
                    "font-weight": "normal",
                    "line-height": "20px"
                });
        }
    }else{
        d3.select(".list-group.retrieved-tweets")
            .append("li").attr("class", "list-group-item retrieved-tweets").attr("id", "cl"+idxI).style({
                "border-color": this.colorScale(i)
            })
            .append("p").attr("class", "list-group-item-text").text("no tweets associated...")
            .style({
                "font-size": "16px",
                "font-weight": "normal",
                "line-height": "20px"
            });
    }
    this.update_retrieved_tweets_number(classe.length);
    // showing name of classe
    d3.select(".panel.panel-default.retrieved-tweets div.panel-heading").append("p").attr("class","rt-classe").style({
        "text-align": "center",
        "font-size": "1em",
        "font-weight": "300",
        "color": "white",
        "text-shadow": "-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black"
    }).text(classe_name);
}

ATRVis.prototype.update_retrieved_tweets_number = function(qtd){
    // showing number of classes
    d3.select(".panel.panel-default.retrieved-tweets div.panel-heading").append("p")
        .attr("class", "tweets-number")
        .style({
            "text-align": "center",
            "font-size": "1em",
            "font-weight": "300",
            "color": "white",
            "text-shadow": "-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black"
        }).text(qtd+" TWEETS");
}

ATRVis.prototype.change_labeling_request = function(id){
    var data_for_vis_queue_flag = false;
    if(this.data_for_vis_queue.indexOf(id) == -1){
        this.data_for_vis_queue.push(id);
        data_for_vis_queue_flag = true;
    }
    this.labeling_request_queue.push(id);
    this.labeling_request_curr = id;
    this.atrvis_data.dataset[this.labeling_request_curr].labeling = true;
    this.update_labeling_request();
    this.update_labeling_request_number();

    this.resize(data_for_vis_queue_flag, null, null, true);

    tooltip.select(".new-tooltip").style("visibility", "hidden")
    tooltip.select(".tooltip-inner").style("visibility", "hidden")
    $('html, body').animate({ scrollTop: 0 }, 'fast');
}

// color panels with the most probable class or after a class selection
ATRVis.prototype.color_panels = function(selection, i){
    var res = this.get_most_probable_debate(this.atrvis_data.dataset[this.labeling_request_curr]);
    if(!selection){
        if(res[0] != -1){
            d3.selectAll(".panel-heading.no-labeling").style("background-color", this.colorScale(Number(res[0])));
            d3.selectAll(".panel-footer").style("background-color", this.colorScale(Number(res[0])));
        }else{
            d3.selectAll(".panel-heading.no-labeling").style("background-color", this.color4);
            d3.selectAll(".panel-footer").style("background-color", this.color4);
        }
    }else{
        d3.selectAll(".panel-heading.no-labeling").style("background-color", this.colorScale(i));
        d3.selectAll(".panel-footer").style("background-color", this.colorScale(i));
    }

    if(this.labeling_request_curr != -1){
        var res = this.get_most_probable_debate(this.atrvis_data.dataset[this.labeling_request_curr]);
        if(res[0] == -1){
            d3.select(".request-area div.panel-heading").style("background-color", this.color4);
        }else{
            d3.select(".request-area div.panel-heading").style("background-color", this.colorScale(Number(res[0])));
        }
    }
}

ATRVis.prototype.draw_chart = function(d){
    arrow_tooltip.select(".new-tooltip.arrow").style("visibility", "hidden")
    arrow_tooltip.select(".tooltip-inner.arrow").style("visibility", "hidden")

    if(d){
        d = d.replace(/[.,-\/#!$@%\^&\*;:{}=\-_`~()]/g,"");
        d = d.replace(/^\s+|\s+$/g, '');
        if(ATR.stopwords_data.indexOf(d.toLowerCase()) != -1){
            return;
        }else{
            // removing highlight from remaining tokens
            d3.select(this.parentNode).selectAll("span").style({
                "font-weight": "normal",
                "border-style": "none",
                "border-width": "0px",
                "background-color": "rgba(0,0,0,0)",
            });
            // highlight selected token
            d3.select(this).style({
                "font-weight": "bold",
                "border-style": "solid",
                "border-width": "2px",
                "border-color": ATR.color1,
                "background-color": ATR.color2
            });
        }
    }

    if(!ATR.vocab_distribution_data){
        ATR.vocab_distribution_data = []
    }

    var token = null;
    if(d){
        d = d.replace(/[.,-\/#!$@%\^&\*;:{}=\-_`~()]/g,"");
        d = d.replace(/^\s+|\s+$/g, '');

        token = ATR.token_search(d.toLowerCase());
        ATR.token_selected = d;
    }else{
        token = ATR.token_search(ATR.token_selected.toLowerCase());
    }

    if(!token && d){
        ATR.data_for_chart = {};
    }else{
        ATR.data_for_chart = token;
    }

    d3.select("svg.bar-chart").remove();
    bar_width = d3.select(".request-area").style("width").split("px")[0];
    bar_height = window.innerHeight-d3.select(".request-area").style("height").split("px")[0]-ATR.c_max_height_offset;
    if(bar_height < ATR.min_height)
            bar_height = ATR.min_height;
    d3.select(".panel-body.chart").style("height",bar_height+"px");
    draw_bar_chart(bar_width, bar_height, ATR.data_for_chart);
    if(d)
        $('.nav.nav-tabs a[href="#li1"]').tab('show');
}

ATRVis.prototype.draw_bundle = function(debates_data_flag){
    // load/process data for bundle
    if(!this.data_for_bundle || debates_data_flag){
        this.data_for_vis_queue_hash = {};

        var count_tweets = 0;
        this.data_for_bundle = [];
        for(i in this.data_for_vis_queue){

            this.data_for_vis_queue_hash[String(this.data_for_vis_queue[i])] = Number(count_tweets);

            if(this.atrvis_data.dataset[this.data_for_vis_queue[i]].prev_deb != "non-retrieved")
                this.data_for_bundle.push({"name":"root."+this.atrvis_data.dataset[this.data_for_vis_queue[i]].prev_deb+".Tweet"+count_tweets, "imports": [], "twitter": this.atrvis_data.dataset[this.data_for_vis_queue[i]]});
            else
                this.data_for_bundle.push({"name":"root.non_retrieved.Tweet"+count_tweets, "imports": [], "twitter": this.atrvis_data.dataset[this.data_for_vis_queue[i]]});

            count_tweets = count_tweets + 1;
        }
        // getting neighbours
        this.get_neighbours();

        this.set_classes_name_and_color();
    }

    if(this.resized || !d3.select("svg.bundle")[0][0]){
        this.resized = false;
        d3.select("svg.bundle").remove();
        bar_width = d3.select(".request-area").style("width").split("px")[0]-(Number(d3.select(".panel-body").style("padding").split("px")[0])*2);
        bar_height = window.innerHeight-d3.select(".request-area").style("height").split("px")[0]-this.c_max_height_offset;
        if(bar_height < this.min_height)
            bar_height = this.min_height;
        d3.select(".panel-body.bundle").style("height",bar_height+"px");
        bundle(bar_width, bar_height, this.classes_name, this.classes_color, this.max_val_threshold);
    }
}

ATRVis.prototype.draw_force_layout = function(threshold_changed, debates_data_flag){
    // load/process data for force-layout
    if(!this.data_for_force_layout || threshold_changed || debates_data_flag){
        this.data_for_vis_queue_hash2 = {};

        this.data_for_force_layout = {
                "nodes": [],
                "links": []
        };

        var count_tweets = 0;
        for(i in this.data_for_vis_queue){
            var deb = -1;
            var max = 0.0;
            // getting the class
            for(j in this.atrvis_data.dataset[this.data_for_vis_queue[i]].scores){
                if(this.atrvis_data.dataset[this.data_for_vis_queue[i]].scores[j].val > max){
                    max = this.atrvis_data.dataset[this.data_for_vis_queue[i]].scores[j].val;
                    deb = j;
                }
            }
            this.data_for_vis_queue_hash2[String(this.data_for_vis_queue[i])] = Number(count_tweets);
            if(this.atrvis_data.dataset[this.data_for_vis_queue[i]].true_label != "non-retrieved")
                this.data_for_force_layout.nodes.push({"name":this.atrvis_data.dataset[this.data_for_vis_queue[i]], "debate_name":this.atrvis_data.dataset[this.data_for_vis_queue[i]].true_label, "debate_number": this.classes_name.indexOf(this.atrvis_data.dataset[this.data_for_vis_queue[i]].true_label)});
            else
                this.data_for_force_layout.nodes.push({"name":this.atrvis_data.dataset[this.data_for_vis_queue[i]], "debate_name":"any", "debate_number": -1});
            count_tweets = count_tweets + 1;
        }
        // getting neighbours
        this.get_neighbours();
    }

    if(this.resized || !d3.select("svg.force-layout")[0][0] || threshold_changed){
        this.resized = false;
        threshold_changed = false;
        d3.select("svg.force-layout").remove();
        bar_width = d3.select(".request-area").style("width").split("px")[0]-(Number(d3.select(".panel-body").style("padding").split("px")[0])*2);
        bar_height = window.innerHeight-d3.select(".request-area").style("height").split("px")[0]-this.c_max_height_offset;
        if(bar_height < this.min_height)
            bar_height = this.min_height;
        d3.select(".panel-body.force-layout").style("height",bar_height+"px");
        force_layout(bar_width, bar_height);
    }
}

ATRVis.prototype.get_neighbours = function(){
    // clean neighbours
    if(this.data_for_bundle)
        for(i=0; i<this.data_for_bundle.length; i++){
            this.data_for_bundle[i].imports = [];
        }
    if(this.data_for_force_layout)
        this.data_for_force_layout.links = [];

    // getting neighbours
    for(i=this.data_for_vis_queue.length-1; i>0; i--){

        var deb = -1;
        var max = 0.0;
        // getting the class (problems with async...)
        for(j in this.atrvis_data.dataset[this.data_for_vis_queue[i]].scores){
            if(this.atrvis_data.dataset[this.data_for_vis_queue[i]].scores[j].val > max){
                max = this.atrvis_data.dataset[this.data_for_vis_queue[i]].scores[j].val;
                deb = j;
            }
        }

        for(j=i-1; j>=0; j--){
            if(deb != -1 && max >= this.threshold){
                if(this.atrvis_data.dataset[this.data_for_vis_queue[j]].scores[deb].val >= this.threshold){
                    if(this.data_for_force_layout){
                        if(this.data_for_force_layout.links.length <= this.force_layout_links_limit)
                            this.data_for_force_layout.links.push({"source":i, "target":j, "value":1});
                    }   
                    if(this.data_for_bundle){
                        if(this.data_for_bundle[i].name.split(".")[1] != this.data_for_bundle[j].name.split(".")[1])
                            this.data_for_bundle[i].imports.push(this.data_for_bundle[j].name);
                    }
                }
            }else{
                if(this.threshold <= 0.0){
                    if(this.data_for_force_layout){
                        if(this.data_for_force_layout.links.length <= this.force_layout_links_limit)
                            this.data_for_force_layout.links.push({"source":i, "target":j, "value":1});
                    }
                    if(this.data_for_bundle)
                        if(this.data_for_bundle[i].name.split(".")[1] != this.data_for_bundle[j].name.split(".")[1])
                            this.data_for_bundle[i].imports.push(this.data_for_bundle[j].name);
                }
            }
        }
    }
}

ATRVis.prototype.on_change = function(value){
    if(value == undefined)
        ATR.threshold = this.value/100.0;
    else
        ATR.threshold = value/100.0;
    d3.selectAll(".form-control.threshold-value").text(ATR.threshold);

    //getting neighbours
    ATR.draw_force_layout(true);
}

ATRVis.prototype.update_labeling_request = function(){
    d3.select(".labeling-request").remove();
    this.clearselection();
    this.labeling_request();
    if(this.labeling_request_curr != -1)
        this.drag_for_labeling_request();
    // updating panel colors and debate info
    var data_info = this.get_data_to_label_informations();
    if(Number(data_info[0] != -1)){
        this.show_discriminative_keyword(data_info[2].classe);
        this.retrieved_tweets(d3.select(".list-group.debates li#cl"+(Number(data_info[0])+1))[0][0],data_info[2],Number(data_info[0]));
    }else{
        // clean list of retrieved and discriminatives features
        d3.selectAll(".panel-body.df span").remove();
        d3.select(".list-group.retrieved-tweets").selectAll(".list-group-item").remove();
        d3.selectAll(".panel.panel-default.retrieved-tweets div.panel-heading p").remove();
        d3.select(".panel.panel-default.discriminative-features div.panel-heading p").remove();
    }
    this.color_panels(false);
}

ATRVis.prototype.update_keyword_distribution = function(el){
    // load keyword distribution before
    if(!this.vocab_distribution_data){
        this.vocab_distribution_data = [];
    }
    var classe_name = d3.select(".list-group-item#cl"+(this.class_selected.indexOf(true)+1)+" h4 p strong")[0][0].firstChild.data.toLowerCase();

    var _this = this;
    d3.select(el).selectAll("span").each(function(d,i){

        var token = d.replace(/[.,-\/#!$@%\^&\*;:{}=\-_`~()]/g,"");
        token = token.replace(/^\s+|\s+$/g, '');
        var stopword_flag = false;
        if(_this.stopwords_data.indexOf(token.toLowerCase()) != -1){
            stopword_flag = true;
        }

        if(!stopword_flag){
            // replace/update with the list of stopwords
            var token_distribution = _this.token_search(token.toLowerCase());
            // add +1 for the correspondent class
            if(!token_distribution){
                var token_distribution = {
                    "token": token.toLowerCase(),
                    "scores": [
                        {"debate": classe_name, "val": 0}
                    ]
                }
                _this.vocab_distribution_data.push(token_distribution);
            }
            var flag = false;
            for(i in token_distribution.scores){
                if(token_distribution.scores[i].debate == classe_name){
                    token_distribution.scores[i].val = token_distribution.scores[i].val + 1
                    flag = true;
                }
            }
            if(!flag){
                token_distribution.scores.push({"debate": classe_name, "val": 1})
            }
        }
    })
}

ATRVis.prototype.draw_reply_chain = function(debates_data_flag, ids, new_class){
    if(ids || debates_data_flag){
        if(debates_data_flag || this.rc_label_all){
            this.rc_label_all = false;
            var tweets = [];
            var stack = [];
            tweets.push(this.reply_chain_data);
            for(var i in this.reply_chain_data.children){
                stack.push(this.reply_chain_data.children[i]);
                tweets.push(this.reply_chain_data.children[i]);
            }
            while(stack.length > 0){
                var obj = stack.pop();
                for(var i in obj.children){
                    stack.push(obj.children[i]);
                    tweets.push(obj.children[i]);
                }
            }
            for(var i in tweets){
                if(ids.indexOf(tweets[i].id) > -1){
                    tweets[i].classe_number = Number(new_class);
                }
            }
        }

        if(this.resized || !d3.select("svg.reply-chain")[0][0]){
            this.resized = false;

            bar_width = d3.select(".panel-body.reply-chain").style("width").split("px")[0];
            bar_height = window.innerHeight/2;
            if(bar_height < this.min_height)
                    bar_height = this.min_height;
            d3.select(".panel-body.reply-chain").style("height",bar_height+"px");

            reply_chain(bar_width, bar_height);
        }
    }
}

ATRVis.prototype.get_reply_chain_ids = function(){
    var ids = [];
    var stack = [];
    ids.push(this.reply_chain_data.id);
    for(var i in this.reply_chain_data.children){
        stack.push(this.reply_chain_data.children[i]);
    }
    while(stack.length > 0){
        var obj = stack.pop();
        ids.push(obj.id);
        for(var i in obj.children){
            stack.push(obj.children[i]);
        }
    }
    return ids;
}

ATRVis.prototype.draw_similarity_hd = function(debates_data_flag){
    var current = 0;
    d3.selectAll(".similarity-hd-span").each(function(d,i){
        if(d3.select(this).attr("selected") == "true"){
            d3.select(this).style("color", "rgba(0,0,0,1)")
            current = i;
        }
        if(d3.select(this).attr("visited") == "true" && d3.select(this).attr("selected") == "false"){
            d3.select(this).style("color", "rgba(0,0,0,0.3)")
        }
    })

    if(!this.data_for_similarity_hd || debates_data_flag){

        this.new_data_similarity_hd = []
        for(var i in this.hashtag_deb_sim_data.HashTags){
            this.new_data_similarity_hd.push({"name": this.hashtag_deb_sim_data.HashTags[i].tagStr, "debates":[]})
            keys = Object.keys(this.debates);
            for(j in keys){
                this.new_data_similarity_hd[i].debates.push({"debate_number": Number(j), "tweets": [], "val": this.hashtag_deb_sim_data.HashTags[i].scores[Number(j)].val})
            }
        }

        for(var j in this.hashtag_deb_sim_data.HashTags){
            for(var i in this.atrvis_data.dataset){
                    if(this.atrvis_data.dataset[i].text.toLowerCase().indexOf("#"+this.hashtag_deb_sim_data.HashTags[j].tagStr) != -1){
                    var max = 0.0;
                    var deb = -1;
                    for(var k in this.atrvis_data.dataset[i].scores){
                        if(this.atrvis_data.dataset[i].scores[k].val > max){
                            max = this.atrvis_data.dataset[i].scores[k].val;
                            deb = k;
                        }
                    }
                    if(deb != -1){
                        this.new_data_similarity_hd[j].debates[deb].tweets.push({"id": i})
                    }else{
                        this.new_data_similarity_hd[j].debates[this.classes_name.indexOf("none")].tweets.push({"id": i})
                    }
                }
            }
        }
    }

    d3.select("svg.similarity-hd").remove();
    this.data_for_similarity_hd = {
        "nodes": [],
        "links": []
    }

    this.data_for_similarity_hd.nodes.push({"name":this.new_data_similarity_hd[current].name, "type": "hashtag"})

    keys = Object.keys(this.debates);
    for(i in keys){
        this.data_for_similarity_hd.nodes.push({"name":"", "debate_name":keys[i], "debate_number": i, "type": "debate"})
    }

    // creating links
    for(j in this.new_data_similarity_hd[current].debates){
        if(this.new_data_similarity_hd[current].debates[j].tweets.length > 0 || this.new_data_similarity_hd[current].debates[j].val > 0){
            this.data_for_similarity_hd.links.push({"source": 0, "target": this.new_data_similarity_hd[current].debates[j].debate_number+1, "value": this.new_data_similarity_hd[current].debates[j].val, "value2": this.new_data_similarity_hd[current].debates[j].tweets.length})
        }
    }

    if(this.resized || !d3.select("svg.similarity-hd")[0][0]){
        this.resized = false;
        bar_width = d3.select(".panel-body.similarity-hd").style("width").split("px")[0];
        bar_height = window.innerHeight/2;
        if(bar_height < this.min_height)
                bar_height = this.min_height;
        d3.select(".panel-body.similarity-hd").style("height",(bar_height+d3.select(".panel-body.similarity-hd-list").style("height"))+"px");
        similarity_hd(bar_width, bar_height, current);
    }
}

ATRVis.prototype.apply = function(){
    ATR.total_iter = 0;
    ATR.labeling_count = 0;
    d3.select(".navbar-brand.history").text("HISTORY (0)");
    d3.select(".pagination.list-inline.iter li#iterc a").text(0);
    d3.select(".pagination.list-inline.iter li#iterp").attr("class", "disabled")
    d3.select(".pagination.list-inline.iter li#itern").attr("class", "disabled")

    // update prev_deb
    for(var i in ATR.atrvis_data.dataset){
        ATR.atrvis_data.dataset[i].prev_deb = ATR.atrvis_data.dataset[i].true_label;
        debates_data_flag = true;
    }
    ATR.resize(debates_data_flag, null, null, true);
}

ATRVis.prototype.resize = function(debates_data_flag, ids, i, rc){
    this.resized = true;
    this.update_bars();

    var offset = window.innerHeight-d3.select(".panel.panel-default.discriminative-features").style("height").split("px")[0]-this.deb_max_h_offset;
    if(offset-this.rt_max_height_offset < this.min_height)
        d3.select(".panel-body.retrieved-tweets").style("height",(this.min_height)+"px");
    else
        d3.select(".panel-body.retrieved-tweets").style("height",(offset-this.rt_max_height_offset)+"px");
    var bar_height = window.innerHeight-d3.select(".request-area").style("height").split("px")[0]-this.c_max_height_offset;
    if(bar_height < this.min_height)
            bar_height = this.min_height;
    d3.select(".panel-body.chart").style("height",bar_height+"px");
    d3.select(".panel-body.force-layout").style("height",bar_height+"px");
    d3.select(".labeling-request").style("width", null);

    if(d3.select("svg.bar-chart")[0][0] != null){
        d3.select("svg.bar-chart").remove();
        bar_width = d3.select(".request-area").style("width").split("px")[0];
    
        draw_bar_chart(bar_width, bar_height, this.data_for_chart);
    }

    if(d3.select("svg.bundle") != null){
        d3.select("svg.bundle").remove();
        this.draw_bundle(debates_data_flag);
    }

    if(d3.select("svg.force-layout")[0][0] != null){
        d3.select("svg.force-layout").remove();
        this.draw_force_layout(debates_data_flag);
    }

    if(d3.select("svg.reply-chain") != null && rc != true){
        d3.select("svg.reply-chain").remove();
        this.draw_reply_chain(debates_data_flag, ids, i);
    }

    if(d3.select("svg.similarity-hd") != null){
        d3.select("svg.similarity-hd").remove();
        this.draw_similarity_hd(debates_data_flag);
    }
}

ATRVis.prototype.change_breadcrumb = function(d, ic){
    var idx_activate = Number(d3.select(".breadcrumb.list-inline li.active").attr("id").split("bcli")[1]);
    if(ic != idx_activate){
        d3.selectAll(".breadcrumb.list-inline li").each(function(d,i){
            if(ic != i){
                ATR.change_breadcrumb_aux(this, i, false);
            }else{
                ATR.change_breadcrumb_aux(this, i, true);
            }
        })
    }
}

ATRVis.prototype.change_breadcrumb_aux = function(el,i, active){
    if(!active){
        d3.select(el).select("a").remove()
        d3.select(el).text("")
        d3.select(el).attr("class", "").style("color", "#777")
        d3.select(el).style("cursor", "pointer")
        d3.select(el).on('click', function(d){
            if(i > 0){
                $(document.body).animate({
                    'scrollTop':   $(ATR.breadcrumb_links[i]).offset().top
                }, 'fast');
            }else{
                $('html, body').animate({ scrollTop: 0 }, 'fast');
            }
        })
        d3.select(el).append("a")
            .text(ATR.breadcrumb_texts[i])
        }else{
            d3.select(el).select("a").remove()
            d3.select(el).text(ATR.breadcrumb_texts[i])
            d3.select(el).attr("class", "active");
            d3.select(el).style("cursor", "default")
        }
}

// send user feedback
ATRVis.prototype.apply2 = function(){
    console.log("sending user feedback...");
    // fake data for tests
    console.log(ATR.feedback);

    ATR.feedback.user_id = ATR.user_id;
    $.ajax({
        type: "POST",
        url: "/ATR-Vis/test",
        data: {feedback: JSON.stringify(ATR.feedback), operation: JSON.stringify("apply_feedback")},
        success: function(msg){
            console.log(msg);
        },
        error: function(msg){
            console.log(msg);
        }
    })
    // sending user feedback
    /*$.ajax({
        type: "POST",
        url: "../cgi-bin/apply_feedback.py",
        data: {feedback: JSON.stringify(ATR.feedback)},
        success: function(msg){
            console.log("feedback successfully applied");
            console.log(msg);
            // wait until java produces the new files
            location.reload();
        },
        error: function(msg){
            console.log("Something went wrong...")
            console.log(msg);
        }
    })*/
}

// load data from server
ATRVis.prototype.load_data2 = function(){
    console.log(this.user_id);
    var user_id = this.user_id;
    var _this = this;
    $.ajax({
        type: "POST",
        url: "/ATR-Vis/test",
        data: {user_id: JSON.stringify(user_id), operation: JSON.stringify("load_user_data")},
        success: function(msg){
            console.log(msg);
        },
        error: function(msg){
            console.log(msg);

            console.log(data);
            ATR.load_data(
                './dataATRVis/'+data[1]+'/ATR-Vis.json',
                './dataATRVis/'+data[1]+'/labelingRequests.json',
                './dataATRVis/'+data[1]+'/new_stop.txt',
                './dataATRVis/'+data[1]+'/VocabDistribution.json',
                './dataATRVis/'+data[1]+'/dkt.json',
                './dataATRVis/'+data[1]+'/reply-chain.json',
                './dataATRVis/'+data[1]+'/HashTagDebateSim.json'
            );
        }
    })
    /*$.ajax({
        type: "POST",
        url: "../cgi-bin/load_user_data.py",
        data: { user_id: JSON.stringify(user_id)},
        success: function(msg){
            console.log("User data loaded!");
            console.log(msg.status);

            // stopwords
            if(_this.stopwords_data == null)
                _this.stopwords_data = JSON.parse(msg.stopwords_data);
            // vocabulary distribution
            _this.vocab_distribution_data = JSON.parse(msg.vocab_distribution_data).VocabList;
            // tweets and debates score
            _this.atrvis_data = JSON.parse(msg.atrvis_data);
            // labeling requests
            _this.labeling_requests_data = JSON.parse(msg.labeling_requests_data);
            // discriminative features
            _this.disc_features_data = JSON.parse(msg.disc_features_data);
            // reply chain
            if(_this.reply_chain_data == null)
                _this.reply_chain_data = JSON.parse(msg.reply_chain_data);
            // hashtag-debate similarity
            if(_this.hashtag_deb_sim_data == null){
                _this.hashtag_deb_sim_data = JSON.parse(msg.hashtag_deb_sim_data);
                _this.load_hds(_this);
            }
        },
        error: function(msg){
            console.log("Something went wrong...")
            console.log(msg);
        }
    })*/
}

// ref: http://stackoverflow.com/questions/14573223/set-cookie-and-get-cookie-with-javascript
function createCookie(name,value,days) {
    if (days) {
        var date = new Date();
        date.setTime(date.getTime()+(days*24*60*60*1000));
        var expires = "; expires="+date.toGMTString();
    }
    else var expires = "";
    document.cookie = name+"="+value+expires+"; path=/";
}

function readCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}

function eraseCookie(name) {
    createCookie(name,"",-1);
}

ATRVis.prototype.login = function(){
    console.log("from cookies: "+readCookie("atrvisuserid"));
    // read cookies
    this.user_id = readCookie("atrvisuserid");
    if(!this.user_id){
        var input = prompt("Please enter your user name", "");
        if((input != null) && (input.trim() != "")){
            this.user_id = input;
            // save cookies
            createCookie("atrvisuserid", input, 7);
            this.load_data2();
        }else{
            alert("Your user name is not valid!")
        }
    }else{
        console.log("User loaded from cookies");
        this.load_data2();
    }
}

/* highlight and fisheye operations */
d3.select("#lr-bundle-button").on('click', function_lr_highlight_bundle_aux)

function function_lr_highlight_bundle_aux(){
    function_lr_highlight_bundle();
}

d3.select("#lr-force-layout-button").on('click', function_lr_highlight_force_layout_aux)

function function_lr_highlight_force_layout_aux(){
    function_lr_highlight_force_layout();
}

d3.select("#fe-bundle-button").on('click', function_fe_bundle_aux)

function function_fe_bundle_aux(){
    function_fe_bundle();
}

d3.select("#fe-force-layout-button").on('click', function_fe_force_layout_aux)

function function_fe_force_layout_aux(){
    function_fe_force_layout();
}

// resize operations
d3.select(window).on("resize", function(d){
    ATR.resize(false, null, null, true);
})

// tab events
d3.select(".nav.nav-tabs li#lii2").on("click", function(d,i){
    ATR.draw_force_layout();
})
d3.select(".nav.nav-tabs li#lii3").on("click", function(d,i){
    arrow_tooltip.select(".new-tooltip.arrow").style("visibility", "hidden")
    arrow_tooltip.select(".tooltip-inner.arrow").style("visibility", "hidden")
    ATR.draw_bundle();
})

// threshold events
d3.selectAll(".form-control.threshold-value").on("click", function(){
    $(this).attr('contentEditable',true)
}).on("blur", function() {
    $(this).attr('contentEditable', false);

    var new_threshold = Number(d3.select(this).text());

    if(new_threshold > ATR.max_val_threshold){
        new_threshold = ATR.max_val_threshold;
        d3.select(this).text(ATR.max_val_threshold);
    }
    else if(new_threshold < 0.0){
        new_threshold = 0.0;
        d3.select(this).text(0.0);
    }

    d3.select(".form-control.threshold#t1")[0][0].value = Number(d3.select(this).text())*100;
    d3.select(".form-control.threshold#t2")[0][0].value = Number(d3.select(this).text())*100;

    ATR.on_change(Number(d3.select(this).text())*100);
    if(function_threshold)
        function_threshold();
}).on("keydown", function(e,i,d){
    e = d3.event;
    if(e.keyCode == 13){
        $(this).attr('contentEditable', false);

        var new_threshold = Number(d3.select(this).text());

        if(new_threshold > ATR.max_val_threshold){
            new_threshold = ATR.max_val_threshold;
            d3.select(this).text(ATR.max_val_threshold);
        }
        else if(new_threshold < 0.0){
            new_threshold = 0.0;
            d3.select(this).text(0.0);
        }

        d3.select(".form-control.threshold#t1")[0][0].value = Number(d3.select(this).text())*100;
        d3.select(".form-control.threshold#t2")[0][0].value = Number(d3.select(this).text())*100;
        ATR.on_change(new_threshold*100);
        if(function_threshold)
            function_threshold();
        return;
    }
    // http://stackoverflow.com/questions/469357/html-text-input-allow-only-numeric-input
    // Allow: backspace, delete, tab, escape, enter and .
    if ($.inArray(e.keyCode, [46, 8, 9, 27, 13, 110, 190]) !== -1 ||
         // Allow: Ctrl+A
        (e.keyCode == 65 && e.ctrlKey === true) ||
         // Allow: Ctrl+C
        (e.keyCode == 67 && e.ctrlKey === true) ||
         // Allow: Ctrl+X
        (e.keyCode == 88 && e.ctrlKey === true) ||
         // Allow: home, end, left, right
        (e.keyCode >= 35 && e.keyCode <= 39)) {
             // let it happen, don't do anything
             return;
    }
    // Ensure that it is a number and stop the keypress
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
        e.preventDefault();
    }
})

d3.selectAll(".form-control.threshold").on("change", function(){
    ATR.on_change(this.value);
    if(function_threshold)
        function_threshold();
    d3.select(".form-control.threshold#t1")[0][0].value = this.value;
    d3.select(".form-control.threshold#t2")[0][0].value = this.value;
});

d3.select(".btn.btn-primary.rc").on('click', function(d){
    ATR.rc_label_all = true;
})

d3.select(".btn.btn-primary.shd").on('click', function(d){
    ATR.shd_label_all = true;
})

//================================= Main
var ATR = new ATRVis();

var data = ["Brazilian","Canadian"]

// ask user name
// - if new user, load static_data
// - load user_data otherwise

ATR.login();

/*ATR.load_data(
    './data/'+data[1]+'/ATR-Vis.json',
    './data/'+data[1]+'/labelingRequests.json',
    './data/'+data[1]+'/new_stop.txt',
    './data/'+data[1]+'/VocabDistribution.json',
    './data/'+data[1]+'/dkt.json',
    './data/'+data[1]+'/reply-chain.json',
    './data/'+data[1]+'/HashTagDebateSim.json'
);*/

// wait load of all data
$(function() {
  var interval = setInterval(function(){
    if(ATR.atrvis_data && ATR.labeling_requests_data && ATR.stopwords_data && ATR.vocab_distribution_data &&
        ATR.disc_features_data && ATR.reply_chain_data && ATR.hashtag_deb_sim_data){
        
        console.log("Data loaded!");
        clearInterval(interval);

        // remove loading symbol
        d3.select(".btn.btn-lg.btn").remove();

        // breadcrumb operations
        $(window).scroll(function (event){
            var home_height = d3.select(".home").style("height");
            // change section
            if(window.scrollY >= home_height.split("px")[0]){
                ATR.change_breadcrumb(null, 1);
            }else{
                ATR.change_breadcrumb(null, 0);
            }
        })

        d3.selectAll(".breadcrumb.list-inline li").each(function(d,i){
            if(i > 0){
                ATR.change_breadcrumb_aux(this, i, false);
            }
        });
        d3.selectAll(".breadcrumb.list-inline li").on("click", ATR.change_breadcrumb);

        // statistics
        d3.select(".pagination.list-inline.iter li#apply").on('click', ATR.apply);
        d3.select(".pagination.list-inline.iter li#apply2").on('click', ATR.apply2);

        // inicialize everything
        ATR.process_atrvis_lr();
        ATR.set_classes_name_and_color();
        ATR.labeling_request();
        ATR.drag_for_labeling_request();
        ATR.update_bars();

        d3.select(".list-group.debates").selectAll(".list-group-item").on("click", function(d,i){
            ATR.show_discriminative_keyword(d.classe);
            ATR.retrieved_tweets(this,d,i);
            ATR.color_panels(true, i);
        });
        var data_info = ATR.get_data_to_label_informations();
        if(Number(data_info[0] != -1)){
            ATR.show_discriminative_keyword(data_info[2].classe);
            ATR.retrieved_tweets(d3.select(".list-group.debates li#cl"+(Number(data_info[0])+1))[0][0],data_info[2],Number(data_info[0]));
        }
        ATR.color_panels(false);

        if(ATR.threshold == -1)
            ATR.threshold = 1;
        d3.selectAll(".form-control.threshold-value").text(ATR.threshold);
        d3.select(".form-control.threshold#t1")[0][0].value = ATR.threshold*100;
        d3.select(".form-control.threshold#t2")[0][0].value = ATR.threshold*100;

        // reply chain
        var ids = ATR.get_reply_chain_ids();
        for(var i in ATR.atrvis_data.dataset){
            if(ids.indexOf(ATR.atrvis_data.dataset[i].id) != -1){
                if(ATR.data_for_vis_queue.indexOf(Number(i)) == -1){
                    ATR.data_for_vis_queue.push(Number(i));
                }
            }
        }
        ATR.draw_reply_chain(false, []);

        // hashtag-debate similarity
        ATR.draw_similarity_hd();
    }else{
        console.log("Loading data...");
    }
  }, 500);
});