var ATRVis = function(){
    // system status
    this.running = false;
    this.firstExecution = true;
    this.done_execution = false;
    this.done_aux = false;
    // variables used to update the system after response from the server
    this.tid2change = {}; // {tid_str: new_debate, ...}
    this.key2change = {}; // {keywords: new_weight, ...}
    // data
    this.dataATR = ["Brazilian","Canadian"];
    this.atrvis_data = null;
    this.labeling_requests_data = null;
    this.stopwords_data = null;
    this.vocab_distribution_data = null;
    this.disc_features_data = null;
    this.reply_chain_data = null;
    this.hashtag_deb_sim_data = null;

    // redo actions
    this.data_history = []; // [{tweets: {id: curr_deb}, keywords: {keyword: curr_deb}}, ...]]
    this.max_by_type_history = [0, 0, 0, 0, 0];
    this.labeling_request_queue_history = [];

    // data for visualization
    this.data_for_vis_queue = [];
    this.data_for_vis_queue_hash = {}; // ring visualization
    this.data_for_vis_queue_hash2 = {}; // force layout
    this.max_for_vis = 160;

    // for labeling request use
    this.max_by_type = [100, 100, 100, 100, 100]; // [equal score, near duplicate, reply chain, hashtag, selected by user]
    this.labeling_request_queue = [];
    this.labeling_request_curr = 0;
    this.data_to_label = null;
    this.pgX = 0;
    this.pgY = 0;
    this.class_selected = [];
    this.labeling_count = 0;
    this.redo_flag = false;

    // for force layout visualization use
    this.data_for_force_layout = null;
    this.force_layout_links_limit = 5000;

    // for force and ring visualizations use
    this.data_for_bundle = null;
    this.tension = -1;
    this.max_val_threshold = 5;
    this.threshold = 1;
    this.main_threshold = 1;

    // for reply chain use
    this.rc_label_all = false;
    this.list_of_rc = null;
    this.rc_curr = 0;
    this.rc_redraw = true;
    this.labeling_request_rc_flag = false;

    // for hashtag-debate similarity use
    this.shd_label_all = false;
    this.data_for_similarity_hd = null;
    this.new_data_similarity_hd = null;
    this.hd_curr = 0;
    this.hd_visited = {};
    this.hd_visited_aux = {};

    // statistics
    this.retrieved_tweets_count = 0;
    this.retrieved_tweets_before_count = 0;
    this.total_iter = 0;
    // recording values
    // 0: change_debate_of_tweet_record = 0;
    // 1: label_of_hashtag_record = 0;
    // 2: label_whole_conversation_reply_tree_record = 0;
    // 3: direct_change_of_disc_feature_record = 0;
    // 4: click_on_urls_record = 0;
    // number of retrieved tweets see above
    this.recording_values = [0, 0, 0, 0, 0];

    // debate names, colors and examples for the Debates' Panel
    this.debates = null;
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
    this.to_ignore_url = ['.',',','\/','#','!','$','@','%','\^','&','\*',';',':','{','}','=','\-','_','`','~','(',')','\"','\'','\”','\“'];
    this.to_ignore_key = ['.',',','\/','!','$','%','\^','&','\*',';',':','{','}','=','\-','_','`','~','(',')','\"','\'','\”','\“'];

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
        tweets: [{"tweet_id_str": 123, "prev_deb": "local food", "curr_deb": "meat inspection act", "strategy": "equal score"}, ...]
        keywords: [{"keyword": "veterans", "prev_deb": "palliative", "curr_deb": "cbc"}, ...]
    */
    this.twt_id_to_check = {};
    this.keyword_id_to_check = {};
    this.hashtag_id_to_check = {};
    this.feedback = {"user_id": null, "tweets": [], "keywords": [], "hashtag_deb_sim": []}; // keywords stands for disc. features
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

//load of initial data
ATRVis.prototype.load_data = function(tds,lr,stp,vd,df,rc,hds){
    var _this = this;
    // tweets and debates score
    $.getJSON(tds, function(data){
        // list of debates
        ATR.debates = {};
        for(var i in data.dataset[0].scores){
            ATR.debates[data.dataset[0].scores[i].debate] = [];
        }
        // class none must be the last
        var keys = Object.keys(ATR.debates);
        if(keys[keys.length-1].toLowerCase() != "none"){
            // change order of debates in atrvis_data
            var from = keys.indexOf("none");
            var to = keys.length-1;
            for(var i in data.dataset){
                data.dataset[i].scores.splice(to, 0, data.dataset[i].scores.splice(from, 1)[0]);
            }
            ATR.debates = {};
            for(var i in data.dataset[0].scores){
                ATR.debates[data.dataset[0].scores[i].debate] = [];
            }
            ATR.atrvis_data = data;
        }else{
            ATR.atrvis_data = data;
        }

        // hashtag-debate similarity
        $.getJSON(hds, function(data2){
            ATR.load_hds_aux(data2);
            ATR.load_hds(false);
        })

        // discriminative features
        $.getJSON(df, function(data){
            ATR.disc_features_data = data;
            // set previous debate
            for(var key in ATR.disc_features_data){
                for(var i in ATR.disc_features_data[key]){
                    ATR.disc_features_data[key][i].prev_deb = key;
                }
            }
            // we need to garantee that it has all the debates
            var keys = Object.keys(ATR.debates);
            for(var j in keys){
                if(!(keys[j] in ATR.disc_features_data))
                    ATR.disc_features_data[keys[j]] = [];
            }
        });

        // it is necessary to load the list of reply chains first
        // and only then load the first of them
        $.getJSON('./data/SelectedReplyChains.json', function(rc_list){
            ATR.list_of_rc = rc_list;
            // reply chain
            $.getJSON('./dataATRVis/'+ATR.dataATR[1]+'/newFiles/Replies/'+ATR.list_of_rc[ATR.rc_curr], function(root){
                // replace the name of the debate by its position in the ATR.debates
                ATR.load_rc_aux(root);
            });
        });
    })
    // labeling requests
    $.getJSON(lr, function(data){
        ATR.labeling_requests_data = data;
    });
    // stopwords
    $.getJSON(stp, function(data){
        ATR.stopwords_data = data;
    });
    // vocabulary distribution
    $.getJSON(vd, function(data){
        ATR.vocab_distribution_data = data.VocabList;
    });
};

ATRVis.prototype.load_rc_aux = function(root){
    var keys = Object.keys(ATR.debates);
    var tweets = [];
    var stack = [];
    tweets.push(root);
    for(var i in root.children){
        stack.push(root.children[i]);
        tweets.push(root.children[i]);
    }
    while(stack.length > 0){
        var obj = stack.pop();
        for(var i in obj.children){
            stack.push(obj.children[i]);
            tweets.push(obj.children[i]);
        }
    }
    // getting current debate from atrvis_data
    var tweets_id = {};
    for(var i in tweets)
        tweets_id[tweets[i].id] = 1;
    for(var i in ATR.atrvis_data.dataset){
        if(ATR.atrvis_data.dataset[i].id in tweets_id){
            var pos = keys.indexOf(ATR.atrvis_data.dataset[i].true_label);
            tweets_id[ATR.atrvis_data.dataset[i].id] = pos;
        }
    }
    for(var i in tweets){
        tweets[i].classe_number = tweets_id[tweets[i].id];
    }
    ATR.reply_chain_data = root;
}

// let the order of the debates the same as the atrvis_data
ATRVis.prototype.load_hds_aux = function(data2){
    var hashtag_deb_sim_data_aux = {};
    hashtag_deb_sim_data_aux.HashTags = [];
    var keys = Object.keys(ATR.debates);
    for(var i in data2.HashTags){
        hashtag_deb_sim_data_aux.HashTags.push({});
        hashtag_deb_sim_data_aux.HashTags[i].tagStr = data2.HashTags[i].tagStr;
        hashtag_deb_sim_data_aux.HashTags[i].scores = [];
        for(var j in keys){
            var flag = false;
            for(var z in data2.HashTags[i].scores){
                if(data2.HashTags[i].scores[z].debate == keys[j]){
                    flag = true;
                    break;
                }
            }
            if(flag){
                hashtag_deb_sim_data_aux.HashTags[i].scores.push({"debate": data2.HashTags[i].scores[z].debate, "val": data2.HashTags[i].scores[z].val});
            }else{
                hashtag_deb_sim_data_aux.HashTags[i].scores.push({"debate": keys[j], "val": 0.0000});
            }
        }
    }
    ATR.hashtag_deb_sim_data = hashtag_deb_sim_data_aux;
}

ATRVis.prototype.load_hds = function(new_data){
    for(var i in ATR.hashtag_deb_sim_data.HashTags){
        d3.select(".panel-body.similarity-hd-list").append("span")
            .attr("class", "similarity-hd-span")
            .attr("id", "shd"+i)
            .attr("visited", function(){
                if(ATR.hashtag_deb_sim_data.HashTags[i].tagStr in ATR.hd_visited)
                    return true;
                else
                    return false;
            })
            .attr("selected", function(){
                if(ATR.hd_curr == i)
                    return true;
                else
                    return false;
            })
            .style({
                "background-color": "white",
                "position": "relative",
                "height": "25px",
                "cursor": "default",
                "font-weight": "bold",
                "color": "rgba(0,0,0,1)"
            })
            .on('click', function(){
                d3.selectAll(".similarity-hd-span").attr("selected", false);
                d3.select(this).attr("selected", true);

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
                    "border-color": ATR.color1,
                    "background-color": ATR.color2
                });
                var i = Number(d3.select(this).attr("id").split('shd')[1]);
                ATR.draw_similarity_hd(new_data, i);

                $(document.body).animate({
                    'scrollTop':   $(ATR.breadcrumb_links[1]).offset().top
                }, 'fast');
            })
        d3.select("#shd"+i).text("#"+ATR.hashtag_deb_sim_data.HashTags[i].tagStr)
    }
    d3.select("#shd"+ATR.hd_curr).attr("selected", true);
    d3.select("#shd"+ATR.hd_curr).style({
        "font-weight": "bold",
        "border-style": "solid",
        "border-width": "2px",
        "border-color": ATR.color1,
        "background-color": ATR.color2
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

ATRVis.prototype.process_labeling_requests = function(first_time){
    if(ATR.redo_flag){
        ATR.labeling_request_queue = [];
        for(var i=0; i<ATR.data_history[ATR.data_history.length-1].labeling_request_queue_history.length; i++)
            ATR.labeling_request_queue.push(ATR.data_history[ATR.data_history.length-1].labeling_request_queue_history[i]);
        if(ATR.labeling_request_queue.length > 0)
            ATR.labeling_request_curr = ATR.labeling_request_queue[0];
        else
            ATR.labeling_request_curr = -1;
        ATR.redo_flag = false;
    }else{
        var labeling_request_queue_apply = [];
        for(var i=0; i<ATR.labeling_request_queue.length; i++)
            labeling_request_queue_apply.push(ATR.labeling_request_queue[i]);
        var labeling_request_queue_aux = [];
        var ids_aux = [];
        var ids_ = [];
        ATR.labeling_request_queue_history = [];

        // selecting labeling requests proportionally
        // performed only for the first time
        // obtaining the number of tweets assigned for each debate

        if(first_time){
            var qtd_by_request_type = {};
            var qtd_by_request_type_aux = ["Equal Score", "Near Duplicate", "Reply Chain", "HashTag", "selected by user"];
            qtd_by_request_type["Equal Score"] = 0;
            qtd_by_request_type["Near Duplicate"] = 0;
            qtd_by_request_type["Reply Chain"] = 0;
            qtd_by_request_type["HashTag"] = 0;
            qtd_by_request_type["selected by user"] = 0;

            ATR.labeling_request_queue = [];
            var qtd_by_debate = {};
            var qtd_by_debate_labeling = {};
            for(var i in ATR.atrvis_data.dataset){
                if(ATR.atrvis_data.dataset[i].true_label in qtd_by_debate){
                    qtd_by_debate[ATR.atrvis_data.dataset[i].true_label].push(i);
                }else{
                    qtd_by_debate[ATR.atrvis_data.dataset[i].true_label] = [];
                    qtd_by_debate[ATR.atrvis_data.dataset[i].true_label].push(i);
                }

                if(ATR.labeling_requests_data.indexOf(ATR.atrvis_data.dataset[i].id) != -1){
                    // checking if it is a labeling request
                    if(ATR.atrvis_data.dataset[i].status == "labeling-request"){
                        ATR.atrvis_data.dataset[i].labeling = true;
                        labeling_request_queue_aux.push(i);
                        ids_aux.push(ATR.atrvis_data.dataset[i].id);
                        if(ATR.atrvis_data.dataset[i].true_label in qtd_by_debate_labeling){
                            qtd_by_debate_labeling[ATR.atrvis_data.dataset[i].true_label].push(i);
                        }else{
                            qtd_by_debate_labeling[ATR.atrvis_data.dataset[i].true_label] = [];
                            qtd_by_debate_labeling[ATR.atrvis_data.dataset[i].true_label].push(i);
                        }
                    }
                }
            }

            if(ATR.max_for_vis > ATR.atrvis_data.dataset.length){
                // show everything
                for(var i in ATR.atrvis_data.dataset){
                    if(ATR.data_for_vis_queue.indexOf(Number(i)) == -1){
                        ATR.data_for_vis_queue.push(Number(i));

                        for(var z in qtd_by_request_type_aux){
                            if(qtd_by_request_type[qtd_by_request_type_aux[z]] < ATR.max_by_type[z]){
                                if(ATR.labeling_requests_data.indexOf(ATR.atrvis_data.dataset[Number(i)].id) != -1){
                                    if(ATR.atrvis_data.dataset[Number(i)]["request-type"] == qtd_by_request_type_aux[z]){
                                        if(ATR.labeling_request_queue.indexOf(Number(i)) == -1){
                                            ATR.labeling_request_queue.push(Number(i));
                                            ids_.push(ids_aux[i]);
                                            qtd_by_request_type[qtd_by_request_type_aux[z]] = qtd_by_request_type[qtd_by_request_type_aux[z]] + 1;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }else{
                // show labeling requests proportionally
                var prop = ATR.max_for_vis/ATR.atrvis_data.dataset.length;
                var prop_by_debate = {};
                var keys = Object.keys(qtd_by_debate);
                for(var i in keys){
                    prop_by_debate[keys[i]] = Math.floor((prop*qtd_by_debate[keys[i]].length)+0.5);
                    if(prop_by_debate[keys[i]] <= 0)
                        prop_by_debate[keys[i]] = 1;
                }

                for(var i in keys){
                    var shuffled = [];
                    if(keys[i] in qtd_by_debate_labeling){
                        shuffled = shuffle(qtd_by_debate_labeling[keys[i]]);
                    }
                    shuffled = shuffled.concat(shuffle(qtd_by_debate[keys[i]]));
                    for(var j =0; j<prop_by_debate[keys[i]]; j++){
                        if(ATR.data_for_vis_queue.indexOf(Number(shuffled[j])) == -1){
                            ATR.data_for_vis_queue.push(Number(shuffled[j]));

                            for(var z in qtd_by_request_type_aux){
                                if(qtd_by_request_type[qtd_by_request_type_aux[z]] < ATR.max_by_type[z]){
                                    if(ATR.labeling_requests_data.indexOf(ATR.atrvis_data.dataset[shuffled[j]].id) != -1){
                                        if(ATR.atrvis_data.dataset[shuffled[j]]["request-type"] == qtd_by_request_type_aux[z]){
                                            if(ATR.labeling_request_queue.indexOf(shuffled[j]) == -1){
                                                ATR.labeling_request_queue.push(shuffled[j]);
                                                ids_.push(ids_aux[i]);
                                                qtd_by_request_type[qtd_by_request_type_aux[z]] = qtd_by_request_type[qtd_by_request_type_aux[z]] + 1;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if(labeling_request_queue_apply.length > 0){
            var lbl_aux_eq = [];
            var lbl_aux_dif = [];
            // fix labeling request order
            for(var i=0; i<labeling_request_queue_apply.length; i++){
                if(ATR.labeling_request_queue.indexOf(labeling_request_queue_apply[i]) != -1)
                    lbl_aux_eq.push(labeling_request_queue_apply[i]);
            }
            for(var i=0; i<ATR.labeling_request_queue.length; i++){
                if(lbl_aux_eq.indexOf(ATR.labeling_request_queue[i]) == -1)
                    lbl_aux_dif.push(ATR.labeling_request_queue[i]);
            }

            ATR.labeling_request_queue = [];
            for(var i=0; i<lbl_aux_dif.length; i++)
                ATR.labeling_request_queue.push(lbl_aux_dif[i]);
            for(var i=0; i<lbl_aux_eq.length; i++)
                ATR.labeling_request_queue.push(lbl_aux_eq[i]);
        }

        // check if there is copy of ids
        var to_check = {};
        var to_check_id_str = {};
        for(var i=0; i<ATR.labeling_request_queue.length; i++){
            // id_str
            if(ATR.atrvis_data.dataset[ATR.labeling_request_queue[i]].id in to_check_id_str){
                to_check_id_str[ATR.atrvis_data.dataset[ATR.labeling_request_queue[i]].id] = to_check_id_str[ATR.atrvis_data.dataset[ATR.labeling_request_queue[i]].id] + 1;
                ATR.labeling_request_queue.splice(i, 1);
            }else{
                to_check_id_str[ATR.atrvis_data.dataset[ATR.labeling_request_queue[i]].id] = 1;
            }
        }

        // remove labeling request if the system has assigned it to some debate
        for(var i in ATR.labeling_request_queue){
            if("labeling" in ATR.atrvis_data.dataset[ATR.labeling_request_queue[i]]){
                if(ATR.atrvis_data.dataset[ATR.labeling_request_queue[i]].labeling != true || ATR.atrvis_data.dataset[ATR.labeling_request_queue[i]].status != "labeling-request"){
                    ATR.labeling_request_queue.splice(i, 1);
                }
            }
        }
        // update labeling request number
        ATR.update_labeling_request_number();

        if(ATR.labeling_request_queue.length > 0)
            ATR.labeling_request_curr = ATR.labeling_request_queue[0];
        else
            ATR.labeling_request_curr = -1;

        if(first_time)
            ATR.labeling_requests_data = ids_;

        for(var i=0; i<ATR.labeling_request_queue.length; i++){
            ATR.labeling_request_queue_history.push(ATR.labeling_request_queue[i]);
        }
        // debug number of instances selected to be shown
        console.log(ATR.data_for_vis_queue.length);
    }
}

ATRVis.prototype.update_statistics = function(){
    ATR.retrieved_tweets_count = 0;
    for(var i in ATR.atrvis_data.dataset){
        if(ATR.atrvis_data.dataset[i].true_label != "non-retrieved")
            ATR.retrieved_tweets_count = ATR.retrieved_tweets_count + 1;
    }
    d3.select(".retrieval-info").text(ATR.retrieved_tweets_count);
}

// create list of debates and prepare data for visualizations/requests
ATRVis.prototype.process_atrvis_lr = function(){
    // for statistics
    ATR.update_statistics();

    // process labeling requests
    ATR.process_labeling_requests(true);

    // show list of debates
    ATR.update_debate_examples();

    var count_classes = 1;
    for(var key in ATR.debates){
        d3.select(".list-group.debates")
            .append("li").attr("class", "list-group-item").attr("id", "cl"+count_classes).style({
                "border-color": ATR.colorScale(count_classes-1),
                "border-width": ATR.classes_style[0],
                "border-bottom-width": ATR.classes_style[1],
                "border-left-width": ATR.classes_style[2],
                "border-right-width": ATR.classes_style[3],
                "border-top-width": ATR.classes_style[4]
            })
            .style("margin-top", function(d,i){
                if(key.toLowerCase() == "none"){
                    return "5px";
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
            }).html(_this.debates[classe_name][0]);
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
    var keys = Object.keys(ATR.debates)
    for(var i in keys){
        ATR.debates[keys[i]] = [];
    }
    for(var i in ATR.atrvis_data.dataset){
        if(!ATR.atrvis_data.dataset[i].labeling){
            if(ATR.atrvis_data.dataset[i].true_label != "non-retrieved" && ATR.atrvis_data.dataset[i].true_label != ""){
                if(ATR.debates[ATR.atrvis_data.dataset[i].true_label].length == 0){
                    ATR.debates[ATR.atrvis_data.dataset[i].true_label].push(ATR.atrvis_data.dataset[i].text);
                    count_classes = count_classes + 1
                }
            }
            if(count_classes == ATR.debates.length)
                break;
        }
    }
}

ATRVis.prototype.set_classes_name_and_color = function(){
    if(!ATR.classes_name){
        ATR.classes_name = [];
        ATR.classes_color = {};

        keys = Object.keys(ATR.debates);
        for(i=0; i<keys.length; i++){
            new_name = keys[i];
            ATR.classes_name.push(new_name);
            ATR.classes_color[new_name] = i;
        }
        ATR.classes_name.push("non_retrieved");
        ATR.classes_color["non_retrieved"] = -1;
    }
}

ATRVis.prototype.labeling_request = function(){
    d3.select(".request-area div.panel-body.assignment div.done").remove();

    ATR.update_labeling_request_number();

    if(ATR.labeling_request_curr != -1 && ATR.labeling_request_curr != undefined){
        ATR.done_execution = false;

        ATR.data_to_label = ATR.atrvis_data.dataset[ATR.labeling_request_curr];

        // spliting text to allow selection of tokens
        var tokens = ATR.data_to_label.text.split(" ");

        d3.select(".col-xs-4 div.request-area div.panel-body.assignment")
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
            .append("b").attr("class","twitter-info").html("— "+this.data_to_label.fullname+" (@"+this.data_to_label.username+") "+this.data_to_label.created_at);

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

        d3.select(".request-area div.panel-body.assignment").style("height",d3.select(".labeling-request").style("height"));
    }else{
        ATR.done_execution = true;

        console.log("Done");
        d3.select(".request-area div.panel-body.assignment").style("height","240px");

        // draw apply button
        d3.select(".request-area div.panel-body.assignment")
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
                    .on('click', this.done_aux2);
    }
}

ATRVis.prototype.done_aux2 = function(){
    ATR.apply2(true, false);
}

ATRVis.prototype.done = function(){
    ATR.done_execution = true;
    d3.select(".request-area div.panel-body.assignment div.done").remove();

    var done = d3.select(".request-area div.panel-body.assignment").append("div")
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
    d3.select(".request-area div.panel-body.assignment div.done").append("div")
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

    d3.select(".request-area div.panel-body.assignment").style("height","270px");
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
    if(this.labeling_request_curr != -1 && ATR.labeling_request_curr != undefined){
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

ATRVis.prototype.copy_lrq_history = function(){
    ATR.data_history[ATR.total_iter-1].labeling_request_queue_history = [];
    for(var i=0; i<ATR.labeling_request_queue.length; i++){
        ATR.data_history[ATR.total_iter-1].labeling_request_queue_history.push(ATR.labeling_request_queue[i]);
    }
}

ATRVis.prototype.labeling_request_skip = function(){
    ATR.total_iter = ATR.total_iter + 1;
    ATR.data_history.push({tweets: {}, keywords: {}, disc_features: {}, hashtags: {}, labeling_request_queue_history: []});
    ATR.copy_lrq_history();
    ATR.update_nav_history();
    ATR.back_to_section2 = false;
    var idx = ATR.labeling_request_queue.indexOf(ATR.labeling_request_curr);
    var el = ATR.labeling_request_queue.splice(idx, 1)[0];
    ATR.labeling_request_queue.push(el);
    ATR.labeling_request_curr = ATR.labeling_request_queue[0];
    ATR.update_labeling_request();
    ATR.resize(false,null,null,true);
}

ATRVis.prototype.update_max_by_type = function(add, rtype){
    var signal = 1.0;
    if(!add)
        signal = -1.0;
    if(rtype == "Equal Score"){
        ATR.max_by_type[0] = ATR.max_by_type[0] + 1*signal;
        ATR.max_by_type_history[0] = ATR.max_by_type_history[0] + (-1*signal);
    }
    else if(rtype == "Near Duplicate"){
        ATR.max_by_type[1] = ATR.max_by_type[1] + 1*signal;
        ATR.max_by_type_history[1] = ATR.max_by_type_history[1] + (-1*signal);
    }
    else if(rtype == "Reply Chain"){
        ATR.max_by_type[2] = ATR.max_by_type[2] + 1*signal;
        ATR.max_by_type_history[2] = ATR.max_by_type_history[2] + (-1*signal);
    }
    else if(rtype == "HashTag"){
        ATR.max_by_type[3] = ATR.max_by_type[3] + 1*signal;
        ATR.max_by_type_history[3] = ATR.max_by_type_history[3] + (-1*signal);
    }
    else if(rtype == "selected by user"){
        ATR.max_by_type[4] = ATR.max_by_type[4] + 1*signal;
        ATR.max_by_type_history[4] = ATR.max_by_type_history[4] + (-1*signal);
    }
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

            if(ATR.atrvis_data.dataset[ATR.labeling_request_curr].true_label == "non-retrieved"){
                ATR.retrieved_tweets_count = ATR.retrieved_tweets_count + 1;
                d3.select(".retrieval-info").text(ATR.retrieved_tweets_count);
            }

            // save history
            if(!(ATR.labeling_request_curr in ATR.twt_id_to_check)){
                ATR.twt_id_to_check[ATR.labeling_request_curr] = ATR.atrvis_data.dataset[ATR.labeling_request_curr].true_label;
            }
            var id = ATR.atrvis_data.dataset[ATR.labeling_request_curr].id;
            ATR.total_iter = ATR.total_iter + 1;
            ATR.data_history.push({tweets: {}, keywords: {}, disc_features: {}, hashtags: {}, labeling_request_queue_history: []});
            ATR.copy_lrq_history();
            ATR.data_history[ATR.total_iter-1].tweets[id] = {};
            ATR.data_history[ATR.total_iter-1].tweets[id].true_label = ATR.atrvis_data.dataset[ATR.labeling_request_curr].true_label;
            ATR.data_history[ATR.total_iter-1].tweets[id].prev_deb = ATR.atrvis_data.dataset[ATR.labeling_request_curr].prev_deb;
            ATR.data_history[ATR.total_iter-1].tweets[id].status = ATR.atrvis_data.dataset[ATR.labeling_request_curr].status;
            ATR.data_history[ATR.total_iter-1].tweets[id].labeling = ATR.atrvis_data.dataset[ATR.labeling_request_curr].labeling;
            ATR.data_history[ATR.total_iter-1].tweets[id]["request-type"] = ATR.atrvis_data.dataset[ATR.labeling_request_curr]["request-type"];
            ATR.data_history[ATR.total_iter-1].tweets[id].scores = [];
            for(var z=0; z<ATR.atrvis_data.dataset[ATR.labeling_request_curr].scores.length; z++){
                ATR.data_history[ATR.total_iter-1].tweets[id].scores.push({});
                ATR.data_history[ATR.total_iter-1].tweets[id].scores[z].debate = ATR.atrvis_data.dataset[ATR.labeling_request_curr].scores[z].debate;
                ATR.data_history[ATR.total_iter-1].tweets[id].scores[z].val = ATR.atrvis_data.dataset[ATR.labeling_request_curr].scores[z].val;
            }

            ATR.update_nav_history();

            // not a labeling request anymore
            ATR.atrvis_data.dataset[ATR.labeling_request_curr].labeling = false;
            ATR.atrvis_data.dataset[ATR.labeling_request_curr].status = "user_associated";
            ATR.labeling_request_queue.splice(ATR.labeling_request_queue.indexOf(ATR.labeling_request_curr), 1);
            ATR.update_max_by_type(false, ATR.atrvis_data.dataset[ATR.labeling_request_curr]["request-type"]);
            var atrvis_data_flag = false;
            // update tweet class
            var res = ATR.get_most_probable_debate(ATR.atrvis_data.dataset[ATR.labeling_request_curr]);

            if(ATR.atrvis_data.dataset[ATR.labeling_request_curr].true_label != ATR.classes_name[i])
                ATR.recording_values[0] = ATR.recording_values[0] + 1;

            ATR.atrvis_data.dataset[ATR.labeling_request_curr].prev_deb = ATR.atrvis_data.dataset[ATR.labeling_request_curr].true_label;
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
    var kw_keys_aux = {}; // {keyword: {scores: []}}
    if(this.labeling_request_rc_flag && this.rc_label_all){

        if(ATR.rc_label_all)
            ATR.recording_values[2] = ATR.recording_values[2] + 1;

        var ids = this.get_reply_chain_ids();
        for(j in this.atrvis_data.dataset){
            if(ids.indexOf(this.atrvis_data.dataset[j].id) > -1){
                // save history for user's feedback
                if(!(j in ATR.twt_id_to_check)){
                    ATR.twt_id_to_check[j] = ATR.atrvis_data.dataset[j].true_label;
                }

                // save history
                ATR.data_history[ATR.total_iter-1].tweets[ATR.atrvis_data.dataset[j].id] = {};
                ATR.data_history[ATR.total_iter-1].tweets[ATR.atrvis_data.dataset[j].id].true_label = ATR.atrvis_data.dataset[j].true_label;
                ATR.data_history[ATR.total_iter-1].tweets[ATR.atrvis_data.dataset[j].id].prev_deb = ATR.atrvis_data.dataset[j].prev_deb;
                ATR.data_history[ATR.total_iter-1].tweets[ATR.atrvis_data.dataset[j].id].status = ATR.atrvis_data.dataset[j].status;
                ATR.data_history[ATR.total_iter-1].tweets[ATR.atrvis_data.dataset[j].id].labeling = ATR.atrvis_data.dataset[j].labeling;
                ATR.data_history[ATR.total_iter-1].tweets[ATR.atrvis_data.dataset[j].id]["request-type"] = ATR.atrvis_data.dataset[j]["request-type"];
                ATR.data_history[ATR.total_iter-1].tweets[ATR.atrvis_data.dataset[j].id].scores = [];
                for(var z=0; z<ATR.atrvis_data.dataset[j].scores.length; z++){
                    ATR.data_history[ATR.total_iter-1].tweets[ATR.atrvis_data.dataset[j].id].scores.push({});
                    ATR.data_history[ATR.total_iter-1].tweets[ATR.atrvis_data.dataset[j].id].scores[z].debate = ATR.atrvis_data.dataset[j].scores[z].debate;
                    ATR.data_history[ATR.total_iter-1].tweets[ATR.atrvis_data.dataset[j].id].scores[z].val = ATR.atrvis_data.dataset[j].scores[z].val;
                }
                // create virtual element
                var el_aux = d3.select("body").append("div");
                var tokens = ATR.atrvis_data.dataset[j].text.split(" ");
                el_aux.selectAll("span")
                    .data(tokens)
                    .enter().append("span")
                    .html(function(d){ return d+" "; });
                ATR.update_keyword_distribution(el_aux[0][0], kw_keys_aux);
                el_aux.remove();

                if(this.atrvis_data.dataset[Number(j)].true_label == "non-retrieved"){
                    this.retrieved_tweets_count = this.retrieved_tweets_count + 1;
                    d3.select(".retrieval-info").text(this.retrieved_tweets_count);
                }

                // updating request-type
                if(ids.indexOf(this.atrvis_data.dataset[j].id) == 0){
                    ATR.atrvis_data.dataset[j]["request-type"] = "Reply Chain";
                }else{
                    ATR.atrvis_data.dataset[j]["request-type"] = "selected by user";
                }

                // remove from labeling request queue if necessary
                this.atrvis_data.dataset[j].labeling = false;
                var idx = this.labeling_request_queue.indexOf(this.atrvis_data.dataset[j].id);
                if(idx > -1){
                    this.labeling_request_queue.splice(idx, 1);
                    ATR.update_max_by_type(false, ATR.atrvis_data.dataset[j]["request-type"]);
                }
                if(ATR.atrvis_data.dataset[j].true_label != ATR.classes_name[Number(i)]){
                    var res = this.get_most_probable_debate(this.atrvis_data.dataset[j]);
                    // add to the user's feedback
                    atrvis_data_flag = true;
                    this.atrvis_data.dataset[j].scores[i].val = res[1] + 0.5;
                    ATR.atrvis_data.dataset[j].prev_deb = ATR.atrvis_data.dataset[j].true_label;
                    this.atrvis_data.dataset[Number(j)].true_label = this.classes_name[Number(i)]
                }
            }
        }
        id = ids;
    }

    if(this.labeling_request_queue.length > 0){
        this.labeling_request_curr = this.labeling_request_queue[0];
    }
    else{
        this.labeling_request_curr = -1;
    }
    this.update_keyword_distribution(el, kw_keys_aux);
    // save history (keywords)
    var keys = Object.keys(kw_keys_aux);
    for(var z=0; z<keys.length; z++){
        ATR.data_history[ATR.total_iter-1].keywords[keys[z]] = {};
        ATR.data_history[ATR.total_iter-1].keywords[keys[z]].scores = [];
        var deb_aux = {};
        for(var zz=0; zz<kw_keys_aux[keys[z]].scores.length; zz++){
            ATR.data_history[ATR.total_iter-1].keywords[keys[z]].scores.push({});
            ATR.data_history[ATR.total_iter-1].keywords[keys[z]].scores[zz].debate = kw_keys_aux[keys[z]].scores[zz].debate;
            ATR.data_history[ATR.total_iter-1].keywords[keys[z]].scores[zz].val = kw_keys_aux[keys[z]].scores[zz].val;
            deb_aux[ATR.data_history[ATR.total_iter-1].keywords[keys[z]].scores[zz].debate] = 1;
        }
        var keys2 = Object.keys(ATR.debates);
        for(var zz=0; zz<keys2.length; zz++){
            if(!(keys2[zz] in deb_aux)){
                ATR.data_history[ATR.total_iter-1].keywords[keys[z]].scores.push({});
                ATR.data_history[ATR.total_iter-1].keywords[keys[z]].scores[ATR.data_history[ATR.total_iter-1].keywords[keys[z]].scores.length-1].debate = keys2[zz];
                ATR.data_history[ATR.total_iter-1].keywords[keys[z]].scores[ATR.data_history[ATR.total_iter-1].keywords[keys[z]].scores.length-1].val = 0;
            }
        }
    }
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
    if(d3.select("#hide-reply-tree-panel-button").attr("aria-expanded") == "true"){
        if(d3.select(".panel-body.reply-chain svg")[0][0]){
            d3.select("svg.reply-chain").remove();
            this.draw_reply_chain(atrvis_data_flag, id, i);
        }
    }
    // redraw similarity hashtag-debate
    if(d3.select("#hide-similarity-hd-panel-button").attr("aria-expanded") == "true"){
        if(d3.select(".panel-body.similarity-hd svg")[0][0]){
            d3.select("svg.similarity-hd").remove();
            this.draw_similarity_hd(atrvis_data_flag, undefined);
        }
    }
    // update debate examples
    this.update_debate_examples();
    ATR.update_retrieved_tweets_number_in_debates();
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
        var deb_str = "non-retrieved";
        for(var i in t.scores){
            if(t.scores[i].val > max){
                max = t.scores[i].val;
                deb = i;
                deb_str = t.scores[i].debate;
            }
        }
        return [deb, max, deb_str];
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
            .text(function(){ return Math.floor(Number(data_bar[i]) * 100) / 100 });
    })
};

ATRVis.prototype.get_data_to_label_informations = function(){
    if(ATR.labeling_request_curr == -1){
        return [-1, "", null];
    }else{
        if(ATR.data_to_label.true_label == "non-retrieved")
            return [-1, "", null];
        else
            return [ATR.classes_color[ATR.data_to_label.true_label], ATR.data_to_label.true_label, {"classe": ATR.data_to_label.true_label}];
    }
}

ATRVis.prototype.show_discriminative_keyword = function(key){
    key = key.toLowerCase();
    // cleaning prevous number
    d3.select(".panel.panel-default.discriminative-features div.panel-heading p").remove();

    // clean discriminative keywords
    d3.selectAll(".discriminative-span").remove();

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
        keyword = keyword[0] == "prev_deb" ? keyword[1] : keyword[0];
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
                .on('click', function(){
                    ATR.recording_values[4] = ATR.recording_values[4] + 1;
                })
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

    d3.selectAll(".discriminative-span").on('dblclick', function(d, i){
        // retrieving tweets that contain the hashtag
        ATR.retrieved_tweets_disc_features(d3.select(this).text(), d3.select(this).attr("deb"));
    })
}

ATRVis.prototype.retrieved_tweets_disc_features = function(disc_feature, classe_name){
    var classe = [];
    // retrieving tweets that contain the disc_feature
    for(var idxI in ATR.atrvis_data.dataset){
        // the debate must be the same...
        if(ATR.atrvis_data.dataset[idxI].true_label == classe_name){
            if(ATR.atrvis_data.dataset[idxI].text.toLowerCase().indexOf(disc_feature) !== -1){
                var words = ATR.atrvis_data.dataset[idxI].text.toLowerCase().split(' ');
                var flag = false;
                for(var i in words){
                    if(words[i].indexOf(disc_feature) !== -1 && words[i].length >= disc_feature.length){
                        var flag2 = true;
                        for(j in disc_feature){
                            if(disc_feature[j] != words[i][j]){
                                flag2 = false;
                            }
                        }
                        if(flag2){
                            flag = true;
                            break;
                        }
                    }
                }
                if(flag)
                    classe.push([ATR.atrvis_data.dataset[idxI], idxI]);
            }
        }
    }

    // cleaning previous list
    d3.select(".list-group.retrieved-tweets").selectAll(".list-group-item").remove();
    d3.select(".panel.panel-default.retrieved-tweets div.panel-heading p.tweets-number").remove();
    d3.select(".panel.panel-default.retrieved-tweets div.panel-heading p.rt-disc-feature").remove();
    d3.select(".panel.panel-default.retrieved-tweets div.panel-heading p.rt-classe").remove();

    if(classe.length > 0){
        for(var idxI in classe){
            var el = d3.select(".list-group.retrieved-tweets")
                .append("li").attr("class", "list-group-item retrieved-tweets").attr("id", "cl"+idxI).style({
                    "border-color": this.colorScale(ATR.classes_color[classe_name]),
                    //"border-width": "3px"
                })
                .attr("d", function(d){
                    return classe[idxI][1];
                })
                .on('dblclick', function(d){
                    ATR.back_to_section2 = false;
                    ATR.labeling_request_rc_flag = false;
                    ATR.data_for_bundle = null;
                    ATR.data_for_force_layout = null;
                    ATR.change_labeling_request(Number(d3.select(this).attr("d")), "retrieved_tweets");
                })
                .append("p").attr("class", "list-group-item-text").html(classe[idxI][0].text)
                .style({
                    "font-size": "16px",
                    "font-weight": "normal",
                    "line-height": "20px"
                });
        }
    }else{
        d3.select(".list-group.retrieved-tweets")
            .append("li").attr("class", "list-group-item retrieved-tweets").attr("id", "cl"+0).style({
                "border-color": this.colorScale(ATR.classes_color[classe_name])
            })
            .append("p").attr("class", "list-group-item-text").text("no tweets associated...")
            .style({
                "font-size": "16px",
                "font-weight": "normal",
                "line-height": "20px"
            });
    }

    // showing number of tweets
    d3.select(".panel.panel-default.retrieved-tweets div.panel-heading").append("p")
        .attr("class", "tweets-number")
        .style({
            "text-align": "center",
            "font-size": "1em",
            "font-weight": "300",
            "color": "white",
            "text-shadow": "-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black"
        }).text(classe.length+" TWEETS");

    // showing name of classe
    d3.select(".panel.panel-default.retrieved-tweets div.panel-heading").append("p").attr("class","rt-classe").style({
        "text-align": "center",
        "font-size": "1em",
        "font-weight": "300",
        "color": "white",
        "text-shadow": "-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black"
    }).html(classe_name);

    // showing more infos
    d3.select(".panel.panel-default.retrieved-tweets div.panel-heading").append("p").attr("class","rt-disc-feature").style({
        "text-align": "center",
        "font-size": "1em",
        "font-weight": "300",
        "color": "white",
        "text-shadow": "-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black"
    }).html("containing '"+disc_feature+"' in all tweets");
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
    d3.select(".panel.panel-default.retrieved-tweets div.panel-heading p.rt-disc-feature").remove();

    var classe_name = d3.select(el).select(".list-group-item-heading p strong")[0][0].firstChild.data.toLowerCase();
    // current classe: classe_name
    var classe = [];
    for(var idxI in ATR.atrvis_data.dataset){
        if(!ATR.atrvis_data.dataset[idxI].labeling){
            if(ATR.atrvis_data.dataset[idxI].true_label == classe_name){
                classe.push([this.atrvis_data.dataset[idxI], idxI])
            }
        }
    }

    var _this = this;
    var classe_new = [];
    var classe_old = [];
    if(classe.length > 0){
        for(var idxI in classe){
            if(classe[idxI][0].true_label != classe[idxI][0].prev_deb)
                classe_new.push(classe[idxI]);
            else
                classe_old.push(classe[idxI]);
        }
        for(var idxI in classe_new){
            var el = d3.select(".list-group.retrieved-tweets")
                .append("li").attr("class", "list-group-item retrieved-tweets").attr("id", "cl"+idxI).style({
                    "border-color": this.colorScale(i),
                    //"border-width": "3px"
                })
                .attr("d", function(d){
                    return classe_new[idxI][1];
                })
                .on('dblclick', function(d){
                    _this.back_to_section2 = false;
                    _this.labeling_request_rc_flag = false;
                    _this.data_for_bundle = null;
                    _this.data_for_force_layout = null;
                    _this.change_labeling_request(Number(d3.select(this).attr("d")), "retrieved_tweets");
                })
                .append("p").attr("class", "list-group-item-text").html(classe_new[idxI][0].text)
                .style({
                    "font-size": "16px",
                    "font-weight": "normal",
                    "line-height": "20px"
                });
            el.append("hr")
            el.append("p").text("NEW RETRIEVE")
                .style({
                    "color": this.colorScale(i),
                    "margin": "0",
                    "text-align": "center",
                    "font-weight": "bold"
                })
        }
        for(var idxI in classe_old){
            var el = d3.select(".list-group.retrieved-tweets")
                .append("li").attr("class", "list-group-item retrieved-tweets").attr("id", "cl"+idxI).style({
                    "border-color": this.colorScale(i),
                    //"border-width": "3px"
                })
                .attr("d", function(d){
                    return classe_old[idxI][1];
                })
                .on('dblclick', function(d){
                    _this.back_to_section2 = false;
                    _this.labeling_request_rc_flag = false;
                    _this.data_for_bundle = null;
                    _this.data_for_force_layout = null;
                    _this.change_labeling_request(Number(d3.select(this).attr("d")), "retrieved_tweets");
                })
                .append("p").attr("class", "list-group-item-text").html(classe_old[idxI][0].text)
                .style({
                    "font-size": "16px",
                    "font-weight": "normal",
                    "line-height": "20px"
                });
        }
    }else{
        d3.select(".list-group.retrieved-tweets")
            .append("li").attr("class", "list-group-item retrieved-tweets").attr("id", "cl"+0).style({
                "border-color": this.colorScale(i)
            })
            .append("p").attr("class", "list-group-item-text").text("no tweets associated...")
            .style({
                "font-size": "16px",
                "font-weight": "normal",
                "line-height": "20px"
            });
    }
    this.update_retrieved_tweets_number((classe_new.length+classe_old.length), classe_new.length);
    // showing name of classe
    d3.select(".panel.panel-default.retrieved-tweets div.panel-heading").append("p").attr("class","rt-classe").style({
        "text-align": "center",
        "font-size": "1em",
        "font-weight": "300",
        "color": "white",
        "text-shadow": "-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black"
    }).html(classe_name);
}

ATRVis.prototype.update_retrieved_tweets_number = function(qtd, qtd2){
    // showing number of classes
    d3.select(".panel.panel-default.retrieved-tweets div.panel-heading").append("p")
        .attr("class", "tweets-number")
        .style({
            "text-align": "center",
            "font-size": "1em",
            "font-weight": "300",
            "color": "white",
            "text-shadow": "-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black"
        }).text(qtd+" TWEETS ("+qtd2+" NEW)");
}

ATRVis.prototype.update_discriminative_keyword_number = function(qtd, key){
    key = key.toLowerCase();
        // showing number of classes
        d3.select(".panel.panel-default.discriminative-features div.panel-heading").append("p").style({
            "text-align": "center",
            "font-size": "1em",
            "font-weight": "300",
            "color": "white",
            "text-shadow": "-1px 0 black, 0 1px black, 1px 0 black, 0 -1px black"
        }).text(qtd+" FEATURES");
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
                // recording values
                ATR.recording_values[3] = ATR.recording_values[3] + 1;

                // save user feedback
                // get previous debate
                var prev_deb = "";
                var score = 0.0;
                for(var el in _this.disc_features_data[d3.select(this).attr("deb")]){
                    var keys = Object.keys(_this.disc_features_data[d3.select(this).attr("deb")][el]);
                    var aux_prev_deb = _this.disc_features_data[d3.select(this).attr("deb")][el]["prev_deb"];
                    var aux_keyword = keys[0] == "prev_deb" ? keys[1] : keys[0];
                    if(aux_keyword == d3.select(this).text()){
                        prev_deb = aux_prev_deb;
                        score = _this.disc_features_data[d3.select(this).attr("deb")][el][aux_keyword];
                        break;
                    }
                }

                // save history
                // save history for user's feedback
                var disc_f = d3.select(this).text();
                if(!(disc_f in ATR.keyword_id_to_check))
                    ATR.keyword_id_to_check[disc_f] = d3.select(this).attr("deb");
                // save history for the system
                ATR.total_iter = ATR.total_iter + 1;
                ATR.data_history.push({tweets: {}, keywords: {}, disc_features: {}, hashtags: {}, labeling_request_queue_history: []});
                ATR.copy_lrq_history();
                ATR.data_history[ATR.total_iter-1].disc_features[disc_f] = {};
                ATR.data_history[ATR.total_iter-1].disc_features[disc_f].true_label = d3.select(this).attr("deb");
                ATR.data_history[ATR.total_iter-1].disc_features[disc_f].prev_deb = prev_deb;
                ATR.data_history[ATR.total_iter-1].disc_features[disc_f].score = score;

                ATR.update_nav_history();

                var debates_data_flag = false;
                // update discriminative feature debate
                _this.update_discriminative_features(d3.select(this).text(), _this.classes_name[i], d3.select(this).attr("deb"), null);
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

ATRVis.prototype.update_discriminative_features = function(feature, new_debate, old_debate, sc){
    if(new_debate == old_debate){
        return;
    }else{
        if(old_debate != -1){
            var obj = null;
            for(i in ATR.disc_features_data[old_debate]){
                if(ATR.disc_features_data[old_debate][i][feature]){
                    obj = ATR.disc_features_data[old_debate].splice(i,1);
                }
            }
            if(sc != null)
                obj[0][feature] = sc;
            obj[0]["prev_deb"] = old_debate;
            ATR.disc_features_data[new_debate].push(obj[0]);
        }else{
            var obj = {};
            obj[feature] = 1.5;
            obj["prev_deb"] = "none";
            ATR.disc_features_data[new_debate].push(obj);
        }
    }
}

ATRVis.prototype.update_retrieved_tweets_number_in_debates = function(){
    // showing the number of new retrieved tweets in the debates' view
    var news = [];
    for(var i=0; i<Object.keys(ATR.classes_color).length; i++)
        news.push(0);
    for(var idxI in ATR.atrvis_data.dataset){
        if(ATR.atrvis_data.dataset[idxI].true_label != ATR.atrvis_data.dataset[idxI].prev_deb && ATR.atrvis_data.dataset[idxI].true_label != "non-retrieved" && !ATR.atrvis_data.dataset[idxI].labeling){
            var pos = ATR.classes_color[ATR.atrvis_data.dataset[idxI].true_label];
            news[pos] = news[pos]+1;
        }
    }
    d3.selectAll(".list-group.debates li.list-group-item").each(function(d, i){
        d3.select(this).select("p.debates-new-retrieved").remove();
        if(news[i] > 0){
            d3.select(this)
                .append("p")
                    .attr("class", "debates-new-retrieved")
                    .text(news[i]+" NEW")
                    .style({
                        "color": ATR.colorScale(i),
                        "margin": "0",
                        "text-align": "left",
                        "font-weight": "bold"
                    })
        }
    })
}

ATRVis.prototype.change_labeling_request = function(id, from){
    // save history
    var idz = ATR.atrvis_data.dataset[id].id;
    ATR.total_iter = ATR.total_iter + 1;
    ATR.update_nav_history();
    ATR.data_history.push({tweets: {}, keywords: {}, disc_features: {}, hashtags: {}, labeling_request_queue_history: []});
    ATR.copy_lrq_history();
    ATR.data_history[ATR.total_iter-1].tweets[idz] = {};
    ATR.data_history[ATR.total_iter-1].tweets[idz].true_label = ATR.atrvis_data.dataset[id].true_label;
    ATR.data_history[ATR.total_iter-1].tweets[idz].prev_deb = ATR.atrvis_data.dataset[id].prev_deb;
    ATR.data_history[ATR.total_iter-1].tweets[idz].status = ATR.atrvis_data.dataset[id].status;
    ATR.data_history[ATR.total_iter-1].tweets[idz]["request-type"] = ATR.atrvis_data.dataset[id]["request-type"];
    ATR.data_history[ATR.total_iter-1].tweets[idz].scores = [];
    for(var z=0; z<ATR.atrvis_data.dataset[id].scores.length; z++){
        ATR.data_history[ATR.total_iter-1].tweets[idz].scores.push({});
        ATR.data_history[ATR.total_iter-1].tweets[idz].scores[z].debate = ATR.atrvis_data.dataset[id].scores[z].debate;
        ATR.data_history[ATR.total_iter-1].tweets[idz].scores[z].val = ATR.atrvis_data.dataset[id].scores[z].val;
    }
    if("labeling" in ATR.atrvis_data.dataset[id])
        ATR.data_history[ATR.total_iter-1].tweets[idz].labeling = ATR.atrvis_data.dataset[id].labeling;
    else
        ATR.data_history[ATR.total_iter-1].tweets[idz].labeling = false;
    var data_for_vis_queue_flag = false;
    if(ATR.data_for_vis_queue.indexOf(id) == -1){
        ATR.data_for_vis_queue.push(id);
        data_for_vis_queue_flag = true;
    }
    if(ATR.labeling_request_queue.indexOf(String(id)) == -1){
        ATR.labeling_request_queue.unshift(String(id));
        ATR.labeling_request_curr = ATR.labeling_request_queue[0];
    }else{
        var idx = ATR.labeling_request_queue.indexOf(String(id));
        var el = ATR.labeling_request_queue.splice(idx, 1)[0];
        ATR.labeling_request_queue.unshift(el);
        ATR.labeling_request_curr = ATR.labeling_request_queue[0];
    }
    
    this.atrvis_data.dataset[this.labeling_request_curr]["status"] = "labeling-request";

    if(this.atrvis_data.dataset[this.labeling_request_curr]["request-type"] == ""){
        if(from == "HashTag")
            this.atrvis_data.dataset[this.labeling_request_curr]["request-type"] = from;
        else
            this.atrvis_data.dataset[this.labeling_request_curr]["request-type"] = "selected by user";
    }

    if(from == "Reply Chain"){
        var ids = ATR.get_reply_chain_ids();
        if(ids.indexOf(this.atrvis_data.dataset[this.labeling_request_curr].id) == 0){
            this.atrvis_data.dataset[this.labeling_request_curr]["request-type"] = from;
        }
    }

    if(!ATR.atrvis_data.dataset[ATR.labeling_request_curr].labeling){
        ATR.atrvis_data.dataset[ATR.labeling_request_curr].labeling = true;
        ATR.update_max_by_type(true, ATR.atrvis_data.dataset[ATR.labeling_request_curr]["request-type"]);
    }

    if(ATR.labeling_requests_data.indexOf(ATR.atrvis_data.dataset[this.labeling_request_curr].id) == -1){
        ATR.labeling_requests_data.push(ATR.atrvis_data.dataset[this.labeling_request_curr].id);
    }

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

    if(ATR.labeling_request_curr != -1){
        if(ATR.atrvis_data.dataset[ATR.labeling_request_curr].true_label == "non-retrieved")
            d3.select(".request-area div.panel-heading").style("background-color", ATR.color4);
        else
            d3.select(".request-area div.panel-heading").style("background-color", ATR.colorScale(ATR.classes_color[ATR.atrvis_data.dataset[ATR.labeling_request_curr].true_label]));
    }
}

ATRVis.prototype.draw_chart = function(d){
    var d_ = d;
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
    var url_flag = false;
    if(d){

        if(d.toLowerCase().substr(0,4) == "http"){
            url_flag = true;
            if(d_.toLowerCase().split('//')[1] != undefined){
                d = d_.toLowerCase().split('//')[1].split('/')[1];
            }
        }

        if(d){
            d = d.replace(/[.,-\/#!$@%\^&\*;:{}=\-_`~()\"\'\”\“]/g,"");
            d = d.replace(/^\s+|\s+$/g, '');

            token = ATR.token_search(d.toLowerCase());
            ATR.token_selected = d;
        }else{
            token = ATR.token_search(ATR.token_selected.toLowerCase());    
        }
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
    if(d){
        $('.nav.nav-tabs a[href="#li1"]').tab('show');
        // show curr keyword
        if(url_flag){
            d_ = d_.replace(/^\s+|\s+$/g, '');
            if(ATR.to_ignore_url.indexOf(d_.substr(0,1)) != -1)
                d_ = d_.substr(1,d_.length);
            if(ATR.to_ignore_url.indexOf(d_.substr(d_.length-1,d_.length)) != -1)
                d_ = d_.substr(0,d_.length-1);
            d3.select(".form-control.keyword-distribution").text("");
            d3.select(".form-control.keyword-distribution").append('a')
                .attr('href', d_)
                .attr('target', "_blank")
                .style('text-decoration', 'none')
                .text(d_);
        }else{
            d_ = d_.replace(/^\s+|\s+$/g, '');
            var code = '';
            if(ATR.to_ignore_key.indexOf(d_.substr(0,1)) != -1)
                d_ = d_.substr(1,d_.length);
            if(ATR.to_ignore_key.indexOf(d_.substr(d_.length-1,d_.length)) != -1)
                d_ = d_.substr(0,d_.length-1);
            if(d_.substr(0,1) == "#")
                code = '%23'
            if(d_.substr(0,1) == "@")
                code = '%40'
            d3.select(".form-control.keyword-distribution").text("");
            d3.select(".form-control.keyword-distribution").append('a')
                .attr('href', function(){
                    if(code.length > 0)
                        return 'https://twitter.com/search?q='+code+d_.substr(1,d_.length);
                    else
                        return 'https://twitter.com/search?q='+d_;
                })
                .attr('target', "_blank")
                .style('text-decoration', 'none')
                .text(d_);
        }
    }
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
    for(var i=this.data_for_vis_queue.length-1; i>0; i--){

        for(var j=i-1; j>=0; j--){
            for(var z in ATR.atrvis_data.dataset[ATR.data_for_vis_queue[i]].scores){
                if(ATR.atrvis_data.dataset[ATR.data_for_vis_queue[i]].scores[z].val >= ATR.threshold && ATR.atrvis_data.dataset[ATR.data_for_vis_queue[j]].scores[z].val >= ATR.threshold){
                    //if(ATR.atrvis_data.dataset[ATR.data_for_vis_queue[i]].true_label != ATR.atrvis_data.dataset[ATR.data_for_vis_queue[j]].true_label){
                        if(ATR.data_for_force_layout){
                            if(ATR.data_for_force_layout.links.length <= ATR.force_layout_links_limit)
                                ATR.data_for_force_layout.links.push({"source":i, "target":j, "value":1});
                        }
                        if(ATR.data_for_bundle){
                            if(ATR.data_for_bundle[i].name.split(".")[1] != ATR.data_for_bundle[j].name.split(".")[1])
                                ATR.data_for_bundle[i].imports.push(ATR.data_for_bundle[j].name);
                        }
                    //}
                }else{
                    if(ATR.threshold <= 0.0){
                        if(ATR.data_for_force_layout){
                            if(ATR.data_for_force_layout.links.length <= ATR.force_layout_links_limit)
                                ATR.data_for_force_layout.links.push({"source":i, "target":j, "value":1});
                        }
                        if(ATR.data_for_bundle)
                            if(ATR.data_for_bundle[i].name.split(".")[1] != ATR.data_for_bundle[j].name.split(".")[1])
                                ATR.data_for_bundle[i].imports.push(ATR.data_for_bundle[j].name);
                    }
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
    if(ATR.labeling_request_curr != -1){
        var data_info = ATR.get_most_probable_debate(ATR.atrvis_data.dataset[ATR.labeling_request_curr]); // res[deb, max]
        if(Number(data_info[0] != -1)){
            this.show_discriminative_keyword(data_info[2]);
            this.retrieved_tweets(d3.select(".list-group.debates li#cl"+(Number(data_info[0])+1))[0][0],{"classe": data_info[2]},Number(data_info[0]));
            ATR.done_execution = false;
        }else{
            // clean list of retrieved and discriminatives features
            d3.selectAll(".panel-body.df span").remove();
            d3.select(".list-group.retrieved-tweets").selectAll(".list-group-item").remove();
            d3.selectAll(".panel.panel-default.retrieved-tweets div.panel-heading p").remove();
            d3.select(".panel.panel-default.discriminative-features div.panel-heading p").remove();
        }
    }else{
        // clean list of retrieved and discriminatives features
        d3.selectAll(".panel-body.df span").remove();
        d3.select(".list-group.retrieved-tweets").selectAll(".list-group-item").remove();
        d3.selectAll(".panel.panel-default.retrieved-tweets div.panel-heading p").remove();
        d3.select(".panel.panel-default.discriminative-features div.panel-heading p").remove();
    }
    this.color_panels(false);
}

ATRVis.prototype.update_keyword_distribution = function(el, kw_keys_aux){
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
                token_distribution = {
                    "token": token.toLowerCase(),
                    "scores": [
                        {"debate": classe_name, "val": 0}
                    ]
                }
                _this.vocab_distribution_data.push(token_distribution);
            }
            if(!(token.toLowerCase() in kw_keys_aux)){
                kw_keys_aux[token.toLowerCase()] = {};
                kw_keys_aux[token.toLowerCase()].scores = [];
                for(var z=0; z<token_distribution.scores.length; z++){
                    kw_keys_aux[token.toLowerCase()].scores.push({});
                    kw_keys_aux[token.toLowerCase()].scores[z].debate = token_distribution.scores[z].debate;
                    kw_keys_aux[token.toLowerCase()].scores[z].val = token_distribution.scores[z].val;
                }
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

ATRVis.prototype.draw_similarity_hd = function(debates_data_flag, new_curr){
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

    if(new_curr != undefined){
        ATR.hd_curr = new_curr;
        current = new_curr;
    }

    if(!ATR.data_for_similarity_hd || debates_data_flag){

        ATR.new_data_similarity_hd = []
        for(var i in ATR.hashtag_deb_sim_data.HashTags){
            ATR.new_data_similarity_hd.push({"name": ATR.hashtag_deb_sim_data.HashTags[i].tagStr, "debates":[]})
            keys = Object.keys(ATR.debates);
            for(j in keys){
                ATR.new_data_similarity_hd[i].debates.push({"debate_number": Number(j), "tweets": [], "val": ATR.hashtag_deb_sim_data.HashTags[i].scores[Number(j)].val})
            }
        }

        for(var j in ATR.hashtag_deb_sim_data.HashTags){
            for(var i in ATR.atrvis_data.dataset){
                var disc_feature = "#"+ATR.hashtag_deb_sim_data.HashTags[j].tagStr;
                if(ATR.atrvis_data.dataset[i].text.toLowerCase().indexOf("#"+ATR.hashtag_deb_sim_data.HashTags[j].tagStr) !== -1){
                    var words = ATR.atrvis_data.dataset[i].text.toLowerCase().split(' ');
                    var flag = false;
                    for(var ii in words){
                        if(words[ii].indexOf(disc_feature) !== -1 && words[ii].length >= disc_feature.length){
                            var flag2 = true;
                            for(jj in disc_feature){
                                if(disc_feature[jj] != words[ii][jj]){
                                    flag2 = false;
                                }
                            }
                            if(flag2){
                                flag = true;
                                break;
                            }
                        }
                    }
                    if(flag){
                        if(ATR.atrvis_data.dataset[i].true_label != "non-retrieved")
                            ATR.new_data_similarity_hd[j].debates[ATR.classes_color[ATR.atrvis_data.dataset[i].true_label]].tweets.push({"id": i})
                        else
                            ATR.new_data_similarity_hd[j].debates[ATR.classes_name.indexOf("none")].tweets.push({"id": i})
                    }
                }
            }
        }
    }

    d3.select("svg.similarity-hd").remove();
    ATR.data_for_similarity_hd = {
        "nodes": [],
        "links": []
    }

    ATR.data_for_similarity_hd.nodes.push({"name":ATR.new_data_similarity_hd[current].name, "type": "hashtag"})

    keys = Object.keys(ATR.debates);
    for(i in keys){
        ATR.data_for_similarity_hd.nodes.push({"name":"", "debate_name":keys[i], "debate_number": i, "type": "debate"})
    }

    // creating links
    for(j in ATR.new_data_similarity_hd[current].debates){
        if(ATR.new_data_similarity_hd[current].debates[j].tweets.length > 0 || ATR.new_data_similarity_hd[current].debates[j].val > 0){
            ATR.data_for_similarity_hd.links.push({"source": 0, "target": ATR.new_data_similarity_hd[current].debates[j].debate_number+1, "value": ATR.new_data_similarity_hd[current].debates[j].val, "value2": ATR.new_data_similarity_hd[current].debates[j].tweets.length})
        }
    }

    if(ATR.resized || !d3.select("svg.similarity-hd")[0][0]){
        ATR.resized = false;
        bar_width = d3.select(".panel-body.similarity-hd").style("width").split("px")[0];
        bar_height = window.innerHeight/2;
        if(bar_height < ATR.min_height)
                bar_height = ATR.min_height;
        d3.select(".panel-body.similarity-hd").style("height",(bar_height+d3.select(".panel-body.similarity-hd-list").style("height"))+"px");
        similarity_hd(bar_width, bar_height, current);
    }
}

ATRVis.prototype.update_nav_history = function(){
    var iter = ATR.total_iter;
    if(ATR.total_iter <= 0){
        iter = 0;
        d3.select(".pagination.list-inline.iter li#iterp").attr("class", "disabled");
    }else{
        d3.select(".pagination.list-inline.iter li#iterp").attr("class", "");
    }
    d3.select(".navbar-brand.history").text("HISTORY ("+iter+")");
    d3.select(".pagination.list-inline.iter li#iterc a").text(iter);
    d3.select(".pagination.list-inline.iter li#itern").attr("class", "disabled");
}

ATRVis.prototype.apply = function(){
    ATR.total_iter = 0;
    ATR.data_history = [];
    ATR.labeling_count = 0;
    ATR.update_nav_history();

    // update prev_deb
    for(var i in ATR.atrvis_data.dataset){
        ATR.atrvis_data.dataset[i].prev_deb = ATR.atrvis_data.dataset[i].true_label;
        debates_data_flag = true;
    }

    if(ATR.labeling_request_queue.length <= 0)
        ATR.update_vis(false, true);
    else
        ATR.update_vis(false, false);
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

    if(d3.select("#hide-reply-tree-panel-button").attr("aria-expanded") == "true"){
        if(d3.select("svg.reply-chain") != null && rc != true){
            d3.select("svg.reply-chain").remove();
            this.draw_reply_chain(debates_data_flag, ids, i);
        }
    }

    if(d3.select("#hide-similarity-hd-panel-button").attr("aria-expanded") == "true"){
        if(d3.select("svg.similarity-hd") != null){
            d3.select("svg.similarity-hd").remove();
            this.draw_similarity_hd(debates_data_flag, undefined);
        }
    }
}

ATRVis.prototype.load_new_rc_next = function(){
    ATR.load_new_rc(true);
}

ATRVis.prototype.load_new_rc_prev = function(){
    ATR.load_new_rc(false);
}

ATRVis.prototype.load_new_rc = function(next){
    var direction = 1;
    if(!next)
        direction = -1;
    if(ATR.rc_curr+(1*direction) >= ATR.list_of_rc.length || ATR.rc_curr+(1*direction) < 0)
        return;
    // append the refresh icone
    // remove labeling request first
    // and the apply? button
    d3.select(".request-area div.panel-body.assignment div.done").remove();
    d3.select(".labeling-request").remove();
    ATR.clearselection();
    d3.select(".panel-body.assignment").append("button")
        .attr("class", "btn btn-lg btn").append("span")
            .attr("class", "glyphicon glyphicon-refresh glyphicon-refresh-animate");

    // clean reply chain
    d3.select("svg.reply-chain").remove();
    // show loading
    d3.select(".panel-body.reply-chain").append("button")
        .attr("class", "btn btn-lg btn").append("span")
            .attr("class", "glyphicon glyphicon-refresh glyphicon-refresh-animate");

    console.log("requisiting new reply chain...");
    ATR.reply_chain_data = null;
    // reply chain
    ATR.rc_curr = ATR.rc_curr + (1*direction);
    $.getJSON('./dataATRVis/'+ATR.dataATR[1]+'/newFiles/Replies/'+ATR.list_of_rc[ATR.rc_curr], function(root){
        ATR.rc_redraw = true;
        ATR.load_rc_aux(root);
        ATR.update_vis(false, false, true);
        // remove loading symbol
        d3.selectAll(".btn.btn-lg.btn").remove();
    });
}

// send user feedback
ATRVis.prototype.apply2 = function(done, hashtagDebSim){
    // append the refresh icone
    // remove labeling request first
    // and the apply? button
    d3.select(".request-area div.panel-body.assignment div.done").remove();
    d3.select(".labeling-request").remove();
    ATR.clearselection();
    d3.select(".panel-body.assignment").append("button")
        .attr("class", "btn btn-lg btn").append("span")
            .attr("class", "glyphicon glyphicon-refresh glyphicon-refresh-animate");

    // cleaning hashtag similarity
    d3.select(".panel-body.similarity-hd-list").selectAll("span").remove();
    d3.select("svg.similarity-hd").remove();
    d3.select(".panel.panel-default.similarity-hd div.panel-heading").select("p").remove();
    d3.select(".panel.panel-default.similarity-hd div.panel-body.similarity-hd").append("button")
        .attr("class", "btn btn-lg btn").append("span")
            .attr("class", "glyphicon glyphicon-refresh glyphicon-refresh-animate");
    d3.select(".panel.panel-default.similarity-hd div.panel-body.similarity-hd div.panel-body.similarity-hd-list").append("button")
        .attr("class", "btn btn-lg btn").append("span")
            .attr("class", "glyphicon glyphicon-refresh glyphicon-refresh-animate");

    if(ATR.done_execution && done)
        ATR.done_aux = true;
    else
        ATR.done_aux = false;
    console.log("sending user feedback...");
    ATR.feedback.user_id = ATR.user_id;
    // getting what has changed (tweets)
    if(!hashtagDebSim){
        var keys = Object.keys(ATR.twt_id_to_check);
        for(var i=0; i<keys.length; i++){
            if(ATR.atrvis_data.dataset[keys[i]].true_label != ATR.twt_id_to_check[keys[i]]){
                var strategy = "selected by user";
                if(ATR.atrvis_data.dataset[keys[i]]["request-type"] != "")
                    strategy = ATR.atrvis_data.dataset[keys[i]]["request-type"];
                if(ATR.atrvis_data.dataset[keys[i]].true_label != "non-retrieved")
                    ATR.feedback.tweets.push({"tweet_id_str": ATR.atrvis_data.dataset[keys[i]].id, "prev_deb": ATR.twt_id_to_check[keys[i]], "curr_deb": ATR.atrvis_data.dataset[keys[i]].true_label, "strategy": strategy});
            }
        }
    }
    // (disc. features)
    if(!hashtagDebSim){
        var keys2 = Object.keys(ATR.keyword_id_to_check);
        for(var i=0; i<keys2.length; i++){
            res = ATR.get_disc_feat_deb(keys2[i]);
            if(res[0] != ATR.keyword_id_to_check[keys2[i]]){
                if(res[0] != "non-retrieved")
                    ATR.feedback.keywords.push({"keyword": keys2[i], "prev_deb": ATR.keyword_id_to_check[keys2[i]], "curr_deb": res[0]});
            }
        }
    }
    // (hashtags)
    var keys3 = Object.keys(ATR.hd_visited_aux);
    for(var i=0; i<keys3.length; i++){
        if(ATR.hd_visited_aux[keys3[i]] != "non-assigned"){
            ATR.feedback.hashtag_deb_sim.push({"hashtag": ATR.hashtag_deb_sim_data.HashTags[keys3[i]].tagStr, "curr_deb": ATR.hd_visited_aux[keys3[i]]});
        }
    }
    // (recording values)
    ATR.feedback.recording_values = {};
    ATR.feedback.recording_values.change_debate_of_tweet_record = ATR.recording_values[0];
    ATR.feedback.recording_values.label_of_hashtag_record = ATR.recording_values[1];
    ATR.feedback.recording_values.label_whole_conversation_reply_tree_record = ATR.recording_values[2];
    ATR.feedback.recording_values.direct_change_of_disc_feature_record = ATR.recording_values[3];
    ATR.feedback.recording_values.click_on_urls_record = ATR.recording_values[4];
    //var _this = this;
    console.log(ATR.feedback);
    $.ajax({
        type: "POST",
        url: "/ATR-Vis-Customize/test",
        data: {feedback: JSON.stringify(ATR.feedback), operation: JSON.stringify("apply_feedback")},
        success: function(msg){
            ATR.process_response(msg, hashtagDebSim);
        },
        error: function(msg){
            ATR.process_response(msg, hashtagDebSim);
        }
    })
}

ATRVis.prototype.process_response = function(msg, hashtagDebSim){
    console.log(msg);
    if(!hashtagDebSim)
        ATR.feedback = {"user_id": null, "tweets": [], "keywords": [], "hashtag_deb_sim": []};
    else
        ATR.feedback.hashtag_deb_sim = [];

    ATR.key2change = {}; // {keywords: new_weight, ...}
    ATR.tid2change = {};

    var res = msg.responseText.split(',');
    var tweets = res[0].split('];');
    var keywords = res[1].split('];');
    for(var i=0; i<tweets.length; i++){
        if(tweets[i].length > 0){
            var id_str = tweets[i].split(':::')[0];
            ATR.tid2change[id_str] = {};
            ATR.tid2change[id_str].scores = {};
            var scores_aux = tweets[i].split(':::')[1].split('::')[1];
            var scores = scores_aux.split(';');
            var new_deb = scores[0].split(':')[0];
            ATR.tid2change[id_str].true_label = new_deb;
            for(var j=0; j<scores.length; j++){
                if(scores[j].length > 0){
                    var lb = scores[j].split(':')[0];
                    var sc = scores[j].split(':')[1];
                    ATR.tid2change[id_str].scores[lb] = sc;
                }
            }
        }
    }
    for(var i=0; i<keywords.length; i++){
        if(keywords[i].length > 0){
            var key = keywords[i].split('::')[0];
            ATR.key2change[key] = {};
            var scores_aux = keywords[i].split('::')[1];
            var scores = scores_aux.split(';');
            for(var j=0; j<scores.length; j++){
                if(scores[j].length > 0){
                    var lb = scores[j].split(':')[0];
                    var sc = scores[j].split(':')[1];
                    ATR.key2change[key][lb] = sc;
                }
            }
        }
    }

    console.log(ATR.tid2change);
    console.log(ATR.key2change);
    // load new vocab dist if necessary
    if(true){ // true for now
        // vocabulary distribution
        console.log("Reloading vocab...");
        ATR.vocab_distribution_data = null;
        $.getJSON('./dataATRVis/'+ATR.dataATR[1]+'/newFiles/VocabDistribution.json', function(data){
            ATR.vocab_distribution_data = data.VocabList;
        });
        // hashtag debate similarity
        console.log("Reloading hashtag debate similarity...");
        ATR.hashtag_deb_sim_data = null;
        $.getJSON('./dataATRVis/'+ATR.dataATR[1]+'/newFiles/HashTagDebateSim.json', function(data){
            ATR.load_hds_aux(data);
            ATR.load_hds(false);
            if(d3.select("#hide-similarity-hd-panel-button").attr("aria-expanded") == "true"){
                ATR.draw_similarity_hd(true, undefined);
            }
        });
        // reply chain
        $.getJSON('./dataATRVis/'+ATR.dataATR[1]+'/newFiles/Replies/'+ATR.list_of_rc[ATR.rc_curr], function(root){
            ATR.load_rc_aux(root);
        });
    }
    if(!hashtagDebSim){
        ATR.twt_id_to_check = [];
        ATR.keyword_id_to_check = [];
    }else{
        // update infos instead
        // tweets
        var keys = Object.keys(ATR.twt_id_to_check);
        for(var i=0; i<keys.length; i++){
            if(ATR.atrvis_data.dataset[keys[i]].id in ATR.tid2change){
                ATR.twt_id_to_check[keys[i]] = ATR.tid2change[ATR.atrvis_data.dataset[keys[i]].id].true_label;
            }
        }
        // keywords
        var keys2 = Object.keys(ATR.keyword_id_to_check);
        for(var i=0; i<keys2.length; i++){
            if(keys2[i] in ATR.key2change){
                ATR.keyword_id_to_check[keys2[i]] = Object.keys(ATR.key2change[keys2[i]])[0];
            }
        }
    }
    ATR.hashtag_id_to_check = [];
    ATR.hd_visited_aux = {};
    if(ATR.done_aux){
        ATR.run(ATR.done_aux, hashtagDebSim);
        // remove loading symbol
        d3.selectAll(".btn.btn-lg.btn").remove();
    }else{
        ATR.run(false, hashtagDebSim);
        // remove loading symbol
        d3.selectAll(".btn.btn-lg.btn").remove();
    }
}

// load data from server
ATRVis.prototype.load_data2 = function(){
    console.log(this.user_id);
    var user_id = this.user_id;
    var _this = this;
    $.ajax({
        type: "POST",
        url: "/ATR-Vis-Customize/test", // server's address
        data: {user_id: JSON.stringify(user_id), operation: JSON.stringify("load_user_data")},
        success: function(msg){
            console.log(msg);
        },
        error: function(msg){
            console.log(msg);

            console.log(ATR.dataATR);
            ATR.load_data(
                './dataATRVis/'+ATR.dataATR[1]+'/ATR-Vis.json',
                './dataATRVis/'+ATR.dataATR[1]+'/labelingRequests.json',
                './dataATRVis/'+ATR.dataATR[1]+'/new_stop.txt',
                './dataATRVis/'+ATR.dataATR[1]+'/VocabDistribution.json',
                './dataATRVis/'+ATR.dataATR[1]+'/dkt.json',
                './dataATRVis/'+ATR.dataATR[1]+'/reply-chain.json',
                './dataATRVis/'+ATR.dataATR[1]+'/HashTagDebateSim.json'
            );
        }
    })
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
            ATR.run(false);
        }else{
            alert("Your user name is not valid!")
        }
    }else{
        console.log("User loaded from cookies");
        this.load_data2();
        ATR.run(false);
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

d3.select(".pagination.list-inline.iter li#iterp").on('click', function(d){
    if(ATR.total_iter <= 0)
        return;
    // up/downgrade info about tweets
    var twt_keys = Object.keys(ATR.data_history[ATR.total_iter-1].tweets);
    for(var i in ATR.atrvis_data.dataset){
        var pos = twt_keys.indexOf(ATR.atrvis_data.dataset[i].id);
        if(pos != -1){
            // load history
            ATR.atrvis_data.dataset[i].true_label = ATR.data_history[ATR.total_iter-1].tweets[twt_keys[pos]].true_label;
            ATR.atrvis_data.dataset[i].prev_deb = ATR.data_history[ATR.total_iter-1].tweets[twt_keys[pos]].prev_deb;
            ATR.atrvis_data.dataset[i].status = ATR.data_history[ATR.total_iter-1].tweets[twt_keys[pos]].status;
            ATR.atrvis_data.dataset[i].labeling = ATR.data_history[ATR.total_iter-1].tweets[twt_keys[pos]].labeling;
            ATR.atrvis_data.dataset[i]["request-type"] = ATR.data_history[ATR.total_iter-1].tweets[twt_keys[pos]]["request-type"];
            for(var z=0; z<ATR.atrvis_data.dataset[i].scores.length; z++){
                ATR.atrvis_data.dataset[i].scores[z].debate = ATR.data_history[ATR.total_iter-1].tweets[twt_keys[pos]].scores[z].debate;
                ATR.atrvis_data.dataset[i].scores[z].val = ATR.data_history[ATR.total_iter-1].tweets[twt_keys[pos]].scores[z].val;
            }
        }
    }
    // up/downgrade info about keywords
    var kw_keys = Object.keys(ATR.data_history[ATR.total_iter-1].keywords);
    for(var i in ATR.vocab_distribution_data){
        var pos = kw_keys.indexOf(ATR.vocab_distribution_data[i].token);
        if(pos != -1){
            for(var z=0; z<ATR.data_history[ATR.total_iter-1].keywords[kw_keys[pos]].scores.length; z++){
                var flag = false;
                for(var zz=0; zz<ATR.vocab_distribution_data[i].scores.length; zz++){
                    if(ATR.data_history[ATR.total_iter-1].keywords[kw_keys[pos]].scores[z].debate == ATR.vocab_distribution_data[i].scores[zz].debate){
                        flag = true;
                        break;
                    }
                }
                if(flag){ // just update
                    ATR.vocab_distribution_data[i].scores[zz].val = ATR.data_history[ATR.total_iter-1].keywords[kw_keys[pos]].scores[z].val;
                }else{ // new value
                    ATR.vocab_distribution_data[i].scores.push({});
                    ATR.vocab_distribution_data[i].scores[ATR.vocab_distribution_data[i].scores.length-1].debate = ATR.data_history[ATR.total_iter-1].keywords[kw_keys[pos]].scores[z].debate;
                    ATR.vocab_distribution_data[i].scores[ATR.vocab_distribution_data[i].scores.length-1].val = ATR.data_history[ATR.total_iter-1].keywords[kw_keys[pos]].scores[z].val;
                }
            }
        }
    }
    // up/downgrade info about disc_features
    var disc_keys = Object.keys(ATR.data_history[ATR.total_iter-1].disc_features);
    for(var i=0; i<disc_keys.length; i++){
        var res = ATR.get_disc_feat_deb(disc_keys[i]);
        var obj = {}
        obj[disc_keys[i]] = ATR.data_history[ATR.total_iter-1].disc_features[disc_keys[i]].score;
        obj.prev_deb = ATR.data_history[ATR.total_iter-1].disc_features[disc_keys[i]].prev_deb;
        ATR.disc_features_data[res[0]].splice(res[1], 1);
        ATR.disc_features_data[ATR.data_history[ATR.total_iter-1].disc_features[disc_keys[i]].true_label].push(obj);
    }
    // up/downgrade info about hashtags
    var hasht_keys = Object.keys(ATR.data_history[ATR.total_iter-1].hashtags);
    for(var i=0; i<hasht_keys.length; i++){
        ATR.hd_visited_aux[hasht_keys[i]] = ATR.data_history[ATR.total_iter-1].hashtags[hasht_keys[i]].debate;
        ATR.hd_curr = ATR.data_history[ATR.total_iter-1].hashtags[hasht_keys[i]].hd_curr;
        if(ATR.data_history[ATR.total_iter-1].hashtags[hasht_keys[i]].debate == "non-assigned"){
            delete ATR.hd_visited[ATR.hashtag_deb_sim_data.HashTags[hasht_keys[i]].tagStr];
        }
    }
    d3.select(".panel-body.similarity-hd-list").selectAll("span").remove();
    d3.select("svg.similarity-hd").remove();
    d3.select(".panel.panel-default.similarity-hd div.panel-heading").select("p").remove();
    ATR.load_hds(false);
    if(d3.select("#hide-similarity-hd-panel-button").attr("aria-expanded") == "true"){
        ATR.draw_similarity_hd(true, undefined);
    }
    ATR.update_vis(false, false);
    // recover max_by_type limites
    for(var i=0; i<ATR.max_by_type_history.length; i++){
        if(ATR.max_by_type_history[i] < 0){
            ATR.max_by_type[i] = ATR.max_by_type[i] + 1;
            ATR.max_by_type_history[i] = ATR.max_by_type_history[i] + 1;
        }else if(ATR.max_by_type_history[i] > 0){
            ATR.max_by_type[i] = ATR.max_by_type[i] - 1;
            ATR.max_by_type_history[i] = ATR.max_by_type_history[i] - 1;
        }
    }
    // update vis
    ATR.redo_flag = true;
    ATR.process_labeling_requests(false);
    ATR.update_retrieved_tweets_number_in_debates();
    if(ATR.labeling_request_queue.length > 0){
        ATR.update_vis(true, false);
    }
    else{
        ATR.update_labeling_request();
        ATR.update_vis(true, true);
    }
})

d3.select(".pagination.list-inline.iter li#itern").on('click', function(d){
    console.log("itern");
})

ATRVis.prototype.add_events1 = function(){
    // remove loading symbol
    d3.selectAll(".btn.btn-lg.btn").remove();

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
            ATR.change_breadcrumb_aux(this, i, true);
        }
    });

    ATR.change_breadcrumb(null, 1);
    ATR.change_breadcrumb(null, 0);

    d3.select(".pagination.list-inline.iter li#apply2").on('click', ATR.apply2_aux);
}

ATRVis.prototype.apply2_aux = function(){
    ATR.apply2(false, false);
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

ATRVis.prototype.add_events2 = function(){
    d3.select(".list-group.debates").selectAll(".list-group-item").on("click", function(d,i){
        ATR.show_discriminative_keyword(d.classe);
        ATR.retrieved_tweets(this,d,i);
        ATR.color_panels(true, i);
    });

    ATR.color_panels(false);

    if(ATR.threshold == -1)
        ATR.threshold = 1;
    d3.selectAll(".form-control.threshold-value").text(ATR.threshold);
    d3.select(".form-control.threshold#t1")[0][0].value = ATR.threshold*100;
    d3.select(".form-control.threshold#t2")[0][0].value = ATR.threshold*100;
}

ATRVis.prototype.add_events3 = function(){
    var data_info = ATR.get_data_to_label_informations();
    if(Number(data_info[0] != -1)){
        ATR.show_discriminative_keyword(data_info[2].classe);
        ATR.retrieved_tweets(d3.select(".list-group.debates li#cl"+(Number(data_info[0])+1))[0][0],data_info[2],Number(data_info[0]));
    }
    d3.select("#up-bundle-button").on('click', ATR.apply);
    d3.select("#next-rc-button").on('click', ATR.load_new_rc_next);
    d3.select("#prev-rc-button").on('click', ATR.load_new_rc_prev);

    d3.select("#hide-debate-info-panel-button").on('click', ATR.hidden_panels_debate_info);
    d3.select("#hide-similarity-hd-panel-button").on('click', ATR.hidden_panels_similarity_hd);
}

ATRVis.prototype.hidden_panels_similarity_hd = function(){
    // hashtag-debate similarity
    if(d3.select("#hide-similarity-hd-panel-button").attr("aria-expanded") == "true"){
        ATR.draw_similarity_hd();
    }
}

ATRVis.prototype.hidden_panels_debate_info = function(){
    var res = ATR.get_most_probable_debate(ATR.atrvis_data.dataset[ATR.labeling_request_curr]); // res[deb, max]
    if(Number(res[0] != -1)){
        d3.select(".list-group.debates").selectAll(".list-group-item").each(function(d,i){
            if(i == res[0]){
                ATR.show_discriminative_keyword(d.classe);
                ATR.retrieved_tweets(this,d,i);
                ATR.color_panels(true, i);
            }
        });
    }
}

ATRVis.prototype.draw_rc_and_shd = function(){
    // reply chain
    var ids = ATR.get_reply_chain_ids();
    for(var i in ATR.atrvis_data.dataset){
        if(ids.indexOf(ATR.atrvis_data.dataset[i].id) != -1){
        }
    }
    if(d3.select("#hide-reply-tree-panel-button").attr("aria-expanded") == "true"){
        ATR.draw_reply_chain(false, []);
    }

    // hashtag-debate similarity
    if(d3.select("#hide-similarity-hd-panel-button").attr("aria-expanded") == "true"){
        ATR.draw_similarity_hd();
    }
}

ATRVis.prototype.update_rc = function(ids_x_label, downgrade){
    var tweets = [];
    var stack = [];
    // add downgraded tweets to the list to be check
    if(downgrade){
        ids_x_label = {};
        var twt_keys = Object.keys(ATR.data_history[ATR.total_iter-1].tweets);
        for(var i=0; i<twt_keys.length; i++){
            ids_x_label[twt_keys[i]] = {};
            ids_x_label[twt_keys[i]].true_label = ATR.data_history[ATR.total_iter-1].tweets[twt_keys[i]].true_label;
            ids_x_label[twt_keys[i]].scores = {};
        }
    }
    tweets.push(ATR.reply_chain_data);
    for(var i in ATR.reply_chain_data.children){
        stack.push(ATR.reply_chain_data.children[i]);
        tweets.push(ATR.reply_chain_data.children[i]);
    }
    while(stack.length > 0){
        var obj = stack.pop();
        for(var i in obj.children){
            stack.push(obj.children[i]);
            tweets.push(obj.children[i]);
        }
    }
    for(var i in tweets){
        if(tweets[i].id in ids_x_label){
            tweets[i].classe_number = Number(ATR.classes_name.indexOf(ids_x_label[tweets[i].id].true_label))
        }
    }
}

ATRVis.prototype.get_disc_feat_deb = function(keyword){
    var debs = Object.keys(ATR.disc_features_data);
    for(var i=0; i<debs.length; i++){
        for(var j=0; j<ATR.disc_features_data[debs[i]].length; j++){
            var keys = Object.keys(ATR.disc_features_data[debs[i]][j]);
            var keyword_aux = "";
            if(keys[0] == "prev_deb")
                keyword_aux = keys[1];
            else
                keyword_aux = keys[0];
            if(keyword_aux == keyword)
                return [debs[i], j];
        }
    }
    return ["none", null];
}

ATRVis.prototype.update_vis = function(downgrade, done, rp_chain){
    console.log("Trying to update vis...");
    // update labels
    if(!downgrade){
        // tweets
        for(var i in ATR.atrvis_data.dataset){
            if(ATR.atrvis_data.dataset[i].id in ATR.tid2change){

                // not a labeling request anymore
                ATR.atrvis_data.dataset[i].labeling = false;
                ATR.atrvis_data.dataset[i]["request-type"] = "";
                ATR.atrvis_data.dataset[i].status = "alg-associated";
                ATR.atrvis_data.dataset[i].prev_deb = ATR.atrvis_data.dataset[i].prev_deb;
                ATR.atrvis_data.dataset[i].true_label = ATR.tid2change[ATR.atrvis_data.dataset[i].id].true_label;

                var keys = Object.keys(ATR.tid2change[ATR.atrvis_data.dataset[i].id].scores);
                for(var j in ATR.atrvis_data.dataset[i].scores){
                    var pos = keys.indexOf(ATR.atrvis_data.dataset[i].scores[j].debate);
                    if(pos != -1){
                        if(!isNaN(+ATR.tid2change[ATR.atrvis_data.dataset[i].id].scores[keys[pos]]))
                            ATR.atrvis_data.dataset[i].scores[j].val = +ATR.tid2change[ATR.atrvis_data.dataset[i].id].scores[keys[pos]];
                        else
                            ATR.atrvis_data.dataset[i].scores[j].val = 0.0;

                    }else{
                        ATR.atrvis_data.dataset[i].scores[j].val = 0.0;
                    }
                }
            }
        }
        // disc_keywords
        var keys = Object.keys(ATR.key2change);
        for(var i=0; i<keys.length; i++){
            // remove all previous attributions
            var prev_deb = "";
            while(1){
                var res = ATR.get_disc_feat_deb(keys[i]);
                if(res[1] == null)
                    break;
                else{
                    prev_deb = res[0];
                    ATR.disc_features_data[res[0]].splice(res[1], 1);
                }
            }
            // add disc_keywords
            var new_debates = Object.keys(ATR.key2change[keys[i]]);
            for(var j=0; j<new_debates.length; j++){
                var obj = {};
                obj[keys[i]] = +ATR.key2change[keys[i]][new_debates[j]];
                if(prev_deb.length > 0)
                    obj["prev_deb"] = prev_deb;
                else
                    obj["prev_deb"] = new_debates[j];
                // it was supposed to happen?
                if(new_debates[j] != "non-retrieved")
                    ATR.disc_features_data[new_debates[j]].push(obj);
            }
        }
    }
    // update rc
    ATR.update_rc(ATR.tid2change, downgrade);
    // remove history
    if(downgrade){
        ATR.total_iter = ATR.total_iter - 1;
        ATR.data_history.splice(ATR.total_iter, 1);
        ATR.update_nav_history();
    }

    ATR.update_statistics();
    if(!done && !downgrade)
        ATR.process_labeling_requests(false);
    ATR.update_debate_examples();
    if(!done){
        ATR.set_classes_name_and_color();
        ATR.update_labeling_request();
        ATR.update_labeling_request_number();
    }
    ATR.update_bars();
    ATR.redraw_vis(rp_chain);
    if(!downgrade)
        ATR.update_retrieved_tweets_number_in_debates();

    if(done){
        ATR.done();
    }
}

ATRVis.prototype.redraw_vis = function(rp_chain){
    // redraw bundle
    var atrvis_data_flag = true;
    if(!rp_chain){
        if(d3.select(".panel-body.bundle svg")[0][0]){
            d3.select("svg.bundle").remove();
            this.draw_bundle(atrvis_data_flag);
        }
    }
    // redraw force layout
    if(!rp_chain){
        if(d3.select(".panel-body.force-layout svg")[0][0]){
            d3.select("svg.force-layout").remove();
            this.draw_force_layout(atrvis_data_flag);
        }
    }
    // redraw keyword distribution chart
    if(!rp_chain){
        if(d3.select(".panel-body.chart svg")[0][0]){
            d3.select("svg.bar-chart").remove();
            this.draw_chart(null);
        }
    }
    // redraw replay chain
    if(d3.select("#hide-reply-tree-panel-button").attr("aria-expanded") == "true"){
        if(d3.select(".panel-body.reply-chain svg")[0][0] || ATR.rc_redraw){
            d3.select("svg.reply-chain").remove();
            this.draw_reply_chain(atrvis_data_flag, [], null);
        }
    }
    // redraw similarity hashtag-debate
    if(!rp_chain){
        if(d3.select("#hide-similarity-hd-panel-button").attr("aria-expanded") == "true"){
            if(d3.select(".panel-body.similarity-hd svg")[0][0]){
                d3.select("svg.similarity-hd").remove();
                this.draw_similarity_hd(atrvis_data_flag, undefined);
            }
        }
    }
}

ATRVis.prototype.hidden_panels = function(){
    $("#hide-debate-panel-button")
        .prop("disabled", false);

    d3.select("#hide-debate-info-panel-button")
        .attr("aria-expanded", false);
    d3.select("#hide-debate-info-panel")
        .attr("class", "collapse")
        .attr("aria-expanded", false)
        .style("height", "0px");

    $("#hide-debate-info-panel-button")
        .prop("disabled", false);

    d3.select("#hide-context-panel-button")
        .attr("aria-expanded", false);
    d3.select("#hide-context-panel")
        .attr("class", "collapse")
        .attr("aria-expanded", false)
        .style("height", "0px");

    $("#hide-context-panel-button")
        .prop("disabled", false);

    d3.select("#hide-reply-tree-panel-button")
        .attr("aria-expanded", false);
    d3.select("#hide-reply-tree-panel")
        .attr("class", "collapse")
        .attr("aria-expanded", false)
        .style("height", "0px");

    $("#hide-reply-tree-panel-button")
        .prop("disabled", false);

    d3.select("#hide-similarity-hd-panel-button")
        .attr("aria-expanded", false);
    d3.select("#hide-similarity-hd-panel")
        .attr("class", "collapse")
        .attr("aria-expanded", false)
        .style("height", "0px");

    $("#hide-similarity-hd-panel-button")
        .prop("disabled", false);

    d3.select("#hide-rp-hd-panel-button")
        .attr("aria-expanded", false);
    d3.select("#hide-rp-hd-panel")
        .attr("class", "collapse")
        .attr("aria-expanded", false)
        .style("height", "0px");

    $("#hide-rp-hd-panel-button")
        .prop("disabled", false);
}

ATRVis.prototype.run = function(done, hashtagDebSim){
    $(function() {
        var interval = setInterval(function(){
            if(ATR.atrvis_data && ATR.labeling_requests_data && ATR.stopwords_data && ATR.vocab_distribution_data && ATR.disc_features_data && ATR.reply_chain_data && ATR.hashtag_deb_sim_data){
                console.log("Data loaded");
                clearInterval(interval);

                // draw everything
                if(!ATR.running){
                    ATR.running = true;

                    // events 1
                    ATR.add_events1();

                    // inicialize everything
                    ATR.process_atrvis_lr();
                    ATR.set_classes_name_and_color();
                    ATR.labeling_request();
                    ATR.drag_for_labeling_request();
                    ATR.update_bars();

                    // events 2
                    ATR.add_events2();

                    // events 3
                    ATR.add_events3();

                    // replay chain and similarity hd
                    ATR.draw_rc_and_shd();

                    ATR.update_nav_history();

                    ATR.retrieved_tweets_before_count = 0;
                    for(var i in ATR.atrvis_data.dataset){
                        if(ATR.atrvis_data.dataset[i].true_label != "non-retrieved")
                            ATR.retrieved_tweets_before_count = ATR.retrieved_tweets_before_count + 1;
                    }

                    ATR.hidden_panels();
                }else{
                    if(!hashtagDebSim){
                        ATR.total_iter = 0;
                        ATR.data_history = [];
                        ATR.update_nav_history();
                    }
                    ATR.update_vis(false, done);
                }
            }else{
                console.log("Trying to load data!");
            }
        }, 500);
    })
}

//================================= Main
var ATR = new ATRVis();

ATR.login();