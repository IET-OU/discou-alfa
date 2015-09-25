// main container of the application
;var DISCOU = {};

;(function(){
	// let's add trim function to string prototype if Javascript varsion is < then 1.8.1
	if(typeof String.prototype.trim !== 'function') {
		  String.prototype.trim = (function() {
		    return this.replace(/^\s+|\s+$/g, ''); 
		  });
	}
	
	// configuration
	DISCOU.services = {
		entities : "/discou-services/entities",
		index : "/discou-services/index",
		summary : "/discou-services/summary",
		search : "/discou-services/search",
		describe : "/discou-services/describe"
	};

	// utilities
	DISCOU.fragment = function (uri){
	    var ind = (""+uri).lastIndexOf("#")+1;
	    if (ind!=0) return uri.substring(ind);
	    var ind = (""+uri).lastIndexOf("/")+1;
	    if (ind<=0) return uri;
	    if (ind == uri.length) return uri;
	    return unescape(uri.substring(ind)).replace(/_/g, " ");
	};
	DISCOU.template = function (templateName){
		var tmpl = $("#" + templateName + "-template").html();
		return $(tmpl.trim());
	};
	DISCOU.message = function(level, text){
		if(level == "clear"){
			$("#messages").fadeOut();
			return;
		}
		var tmpl = DISCOU.template(level + "-message");
		tmpl.html(text);
		$("#messages").html(tmpl).fadeIn();
	};
	DISCOU.entstring = function (){
		var entstring = "";
		$("#entities li").each(function(){
			var ent = $(this).attr("data-uri");
			var score = $(this).attr("data-score");
			for (var i = 0; i < parseInt(score); i++){
				// this is bad, buffer!
	    	    entstring += ent+" ";
	    	}
		});
		return entstring;
	};
	DISCOU.identify = function(input){
		input = input.toLowerCase().trim();
		// input may be anything
		var entstring = DISCOU.entstring();
		var uri = "urn:discou:input:" + md5( input + entstring );
		return uri;
	};
	DISCOU.entsort = (function(entities){
		var tuples = [];

		for (var key in entities) tuples.push([key, entities[key]]);

		tuples.sort(function(a, b) {
		    a = a[1];
		    b = b[1];

		    return a > b ? -1 : (a < b ? 1 : 0);
		});

		return tuples;
	});
	
	DISCOU.status = {};
	DISCOU.status.working = (function(){
		DISCOU.message("info", "<i class=\"icon icon-spinner icon-spin\"></i>&nbsp;Working...");
		$("textarea,#button-discover").attr("disabled", "disabled");
	});
	DISCOU.status.done = (function(){
		$("textarea").removeAttr("disabled");
		DISCOU.message("clear");
	});
	DISCOU.cookies = {};
	DISCOU.cookies.create = function(name, value, days) {
		var expires = "";
	    if (days) {
	        var date = new Date();
	        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
	        expires = "; expires=" + date.toGMTString();
	    }
	    document.cookie = escape(name) + "=" + escape(value) + expires + "; path=/";
	};

	DISCOU.cookies.read = function(name) {
	    var nameEQ = escape(name) + "=";
	    var ca = document.cookie.split(';');
	    for (var i = 0; i < ca.length; i++) {
	        var c = ca[i];
	        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
	        if (c.indexOf(nameEQ) == 0) return unescape(c.substring(nameEQ.length, c.length));
	    }
	    return null;
	};

	DISCOU.cookies.erase = function(name) {
	    createCookie(name, "", -1);
	};
	
	DISCOU.cacheInput = (function(action){
		if(action == "save"){
			DISCOU.cookies.create("discou-alfa-input-text", $("textarea").val());
		}else if(action == "restore"){
			$("textarea").val(DISCOU.cookies.read("discou-alfa-input-text"));
		}
	});
	
	DISCOU.preview = (function(resId){
		var context = $("#"+resId);
		if(context.hasClass("result-article")){
			var prt = DISCOU.template("preview");
			var location = $(context).attr("data-locator");
			prt.find("iframe").attr("src", location);
			prt.hide();
			$(context).find("h5").after(prt);
			$(context).find(".preview-iframe-wrap .preview-iframe-cover").attr("target","_blank").attr("href", location);
			return prt;
		}
	});
	
	// behaviour
	DISCOU.behaviour = {
		lastInput : null,
		renderEntities : (function(entities){
			tuples = DISCOU.entsort(entities);
		    // populate the list of entities
		    var panel = $("<ul></ul>").addClass("accordion");
		    var entityIndex = 0;
		    for (var i = 0; i < tuples.length; i++) {
		        var ent = tuples[i][0];
		        var score = tuples[i][1];
		    	//var score = entities[ent];
		    	entityIndex++;
		    	var entityId = "entity_" + entityIndex;
		    	var item = DISCOU.template("entity")
		    		.attr("id", entityId)
		    		.attr("data-uri", ent)
		    		.attr("data-score", score)
		    		.attr("data-score-reset", score);
		    	item.find(".entity-label").html(DISCOU.fragment(ent));
		    	
		    	var slider = $("<div></div>")
		    		.addClass("noUiSlider")
		    		.attr("data-entity-id", entityId)
		    		.noUiSlider("init",{
		    		handles : 1,
		    		scale : [0, 10],
		    		//start : parseInt(score), // this option does not work!
		    		step : false,
		    		connect : "lower",
		    		change : function () {
		    			var value = $(this).noUiSlider("value");
		    			value = value[1];
		    			$("#" + $(this).attr("data-entity-id")).find(".entity-score").html(value);
		    			$("#" + $(this).attr("data-entity-id")).attr("data-score", value);
		    			var cls = "demoted";
		    			if(parseInt(value) > 5){
		    				cls = "promoted";
		    			}
		    			$(this).find(".noUi-midBar").removeClass("promoted").removeClass("demoted").addClass(cls);
		    			var entid = $(this).attr("data-entity-id");
		    			$("#"+entid).find(".entity-score").removeClass("promoted").removeClass("demoted").addClass(cls);
		    			$("#button-discover").removeAttr("disabled");
		    		}
		    	});
		    	item.find(".content").html(slider);
		    	item.click(function(event){
		    		$(this).hasClass("active") ? $(this).removeClass("active") : $(this).addClass("active");
		    	});
		    	
		    	item.find(".content").click(function(event){event.stopPropagation();});
		    	panel.append(item);
		    	$("#entities").append(panel);
		    	slider.noUiSlider("move", {knob : 0, to : parseInt(score)});
		    	$("#button-discover").attr("disabled", "disabled"); // it is a bit ugly that we need to force it back here
		    }
		    
		    $("#entities").fadeIn();
		}),
		entities : (function(txt){
			$.ajax(DISCOU.services.entities, {
				method : "POST",
				dataType : "json",
				data : {"text" : txt}
			})
			.fail(function(jqXHR, textStatus, errorThrown){
				// request failed...
				DISCOU.message("failure","Request failed: entities :(");
			})
			.success(function(json){
				var entities = {};
				var arr = json.data;
				for(x in arr){
					entities[arr[x].uri] = parseInt(arr[x].score);
				}
				if(arr.length == 0){
					// if the array is empty, do nothing... or what else?
					DISCOU.message("failure","No relevant entity have been found. Try change or enrich your text.");
					return;
				}
				
				// normalization 0 / 10
			    var max = 0;
			    for (var ent in entities) {
			    	if ( entities[ent] > max ) {
			    		max = entities[ent];
			    	}
			    }
			    for (var ent in entities) {
			    	entities[ent] = Math.round((entities[ent]*10)/max);
			    }
			   
			    DISCOU.behaviour.renderEntities(entities);
			    
			    // index
			    DISCOU.behaviour.index(DISCOU.identify(txt));
			});
		}),
		index : (function(uri){
			// retrieve list of entities and scores
			var entstring = DISCOU.entstring();
			
			$.ajax(DISCOU.services.index, {
				method : "POST",
				data : {"uri" : uri, "entities" : entstring}
			})
			.fail(function(){
				// request failed...
				DISCOU.message("failure","Request failed: index :(");
			})
			.success(function(responseText){
				DISCOU.behaviour.search(uri);
			});
		}),
		search : (function(uri){
			
			// search
			$.ajax(DISCOU.services.search, {
				data : {"uri" : uri, "nb" : 10}
			})
			.fail(function(){
				// request failed...
				DISCOU.message("failure","Request failed: search :(");
			})
			.success(function(responseText){
				var json = responseText;
				
				// this is a json array. if it is empty show a message
				if(json.length == 0){
					DISCOU.message("info","No result found.");
					DISCOU.status.done();
					return; // nothing to do
				}
				
				for(var x in json){
					var result_id = "res_" + x;
					var resuri = json[x];
	
					var res = DISCOU.template("result");
					res.attr("id",result_id);
					res.attr("data-result-uri", resuri);
					res.find(".result-link").attr("href", resuri).attr("target", "_blank");
					$("#results").append(res);
				}
				
				// populate
				for(var x in json){
					var resuri = json[x];
					
					var xhr = $.ajax(DISCOU.services.summary, {dataType : "json", data : {"uri1" : uri, "uri2" : resuri}, context : { "resuri" : resuri, "o" : $("#res_" + x) }})
					.fail(function(ojk){
						// TODO
					});
					xhr.success(function(rts){
						
						// sometimes the summary service does not work as expected
						// if the result is undefined, just skip this part
						if(rts.common == undefined){
							return;
						}
						// this implements the inline buttons
						var o = this.o;
						//var resuri = this.resuri;
						var tmpl = DISCOU.template("actions");
						var summaryLink = tmpl.find(".summary-link");
						var summaryLabel = DISCOU.fragment(rts.common);
						summaryLink.html(summaryLabel);
						tmpl.find(".promote-button").click(function(){
							$('#entities li[data-uri="' + rts.common + '"]')
								.find(".noUiSlider").noUiSlider("move", {knob : 0, to : 10});
							$("#button-discover").click();
						});
						tmpl.find(".demote-button").click(function(){
							$('#entities li[data-uri="' + rts.common + '"]')
								.find(".noUiSlider").noUiSlider("move", {knob : 0, to : 0});
							$("#button-discover").click();
						});
						$(o).find(".result-summary").append(tmpl);
					});
					
					$.ajax(DISCOU.services.describe, {dataType: "xml", data : {"uri" : resuri, "endpoint" : function(){ 
						if( resuri.match("/videofinder/")){
						    return "http://sdata.kmi.open.ac.uk/videofinder/query" ;
						}else if( resuri.match("/vle/")){
						    return "http://sdata.kmi.open.ac.uk/vle/query";
						}else{
						    return "http://data.open.ac.uk/sparql";
						}
					}}, context : $("#res_" + x)})
					.fail(function(ojk){
						// TODO
					})
					.success(function(responseText2){
						
						// sparql result is here
						var spares = $(responseText2);
						var context = this;
						spares.find("result").each(function(){
							
							var property = $(this).find('binding[name="property"]').find("uri").text();
							var value = $(this).find('binding[name="value"]').find("uri,literal").text();
							
							if(property == 'http://data.open.ac.uk/ontology/relatesToCourse') return;
							var className = null;
							var htmlValue = value;
							switch(property){
								case "http://www.w3.org/1999/02/22-rdf-syntax-ns#type":
									context.attr("data-type", value);
									var cssType = null;
									var heading5 = context.find("h5");
									// dont' do anything if an icon is already there
									if(heading5.find("i.icon").length){
										return;
									}
									switch(value){
										case "http://data.open.ac.uk/videofinder/ontology/VideofinderObject":
											cssType = "article";
											heading5.attr("title","Videofinder Object").prepend("<i class=\"icon icon-film\"></i>&nbsp;");
											break;
										case "http://data.open.ac.uk/podcast/ontology/AudioPodcast":
											cssType = "audio";
											heading5.attr("title","Audio Podcast").prepend("<i class=\"icon icon-headphones\"></i>&nbsp;");
											break;
										case "http://xmlns.com/foaf/0.1/Document":
											cssType = "article";
											heading5.attr("title","Document").prepend("<i class=\"icon icon-file\"></i>&nbsp;");
											break;
										case "http://data.open.ac.uk/openlearn/ontology/OpenLearnUnit":
											cssType = "unit";
											heading5.attr("title","OpenLearn Unit").prepend("<i class=\"icon icon-book\"></i>&nbsp;");
											break;
										case "http://data.open.ac.uk/podcast/ontology/VideoPodcast":
											cssType = "video";
											heading5.attr("title","Video Podcast").prepend("<i class=\"icon icon-film\"></i>&nbsp;");
											break;
										case "http://data.open.ac.uk/openlearn/ontology/OpenLearnExloreArticle":
											heading5.attr("title","OpenLearn Explore article").prepend("<i class=\"icon icon-file\"></i>&nbsp;");
										default:
											cssType = "article";
									}
									context.addClass("result-" + cssType);
									className = "type";
									return; // do not show
									break;
								case "http://www.w3.org/2000/01/rdf-schema#comment":
								case "http://purl.org/dc/terms/description":
								case 'http://data.open.ac.uk/ontology/relatesToCourse':
									className = "description";
									break;
								case "http://purl.org/dc/terms/title":
								case "http://www.w3.org/2000/01/rdf-schema#label":
									className = "label";
									break;
								case "http://www.w3.org/TR/2010/WD-mediaont-10-20100608/locator":
								case "http://xmlns.com/foaf/0.1/page":
									className = "locator";
									htmlValue = DISCOU.template("go-button")
										.attr("href", value);
									$(context).attr("data-locator", value);
									$(context).find(".result-link").attr("href", value);
									break;
							}
	
							var propertyElement = $(context).find(".result-" + className);
							if(propertyElement.html().length < htmlValue.length){
								propertyElement.attr("data-result-property", property);
								propertyElement.attr("data-result-value", value);
								propertyElement.html(htmlValue);
							}
						});
	

						// XXX Media embedding does not work on Firefox
						if(typeof navigator.mozGetUserMedia == "function"){
							// firefox?
							return;
						}
						
						// if video, embed
						if($(context).hasClass("result-video")){
							var video = DISCOU.template("video");
							var location = $(context).attr("data-locator");
							video.attr("src", location);
							video.find("source")
								.attr("src",location)
								.attr("type", "video/x-m4v");
							video.find("embed")
								.attr("src", location)
								.attr("type", "video/x-m4v")
								.attr("pluginspage", "http://www.apple.com/quicktime/download")
								;
							$(context).find(".result-description").before(video);
							
						}
						
						// if audio, embed
						if($(context).hasClass("result-audio")){
							var location = $(context).attr("data-locator");
							
							// TODO if file is not mp3 skip or add support to other file types
							
							var audio = DISCOU.template("audio");
							$(context).find(".result-bottom").before(audio);
							
							audio.attr("width", "100%");
							audio.find("source")
								.attr("src", location)
								.attr("type", "audio/mp3");
							audio.find("embed")
								.attr("src", location)
								.attr("type", "audio/mp3")
								.attr("autoplay", "false")
								.attr("height", "17px")
								.attr("width", "100%");
							$(context).find(".result-locator").empty();
						}
						
						// if article, preview (unfortunately units cannot be embedded in frames)
						if($(context).hasClass("result-article") && ( !$(context).hasClass("result-unit") )){
							var link = $(context).find("h5 a");
							link.attr("data-result-id", $(context).attr("id"));
							$(context).find("h5 a").hover(function(){
								// in
								var i = $(this).attr("data-result-id");
								var o = $("#" + i);
								var p = o.find(".preview");
								if(p.length == 0){
									// build it
									p = DISCOU.preview(o.attr("id"));
								}
								p.fadeIn();
							});
							$(context).hover(function(){},function(){
								// out
								$(this).find(".preview").fadeOut();
							});
						}
					});
				}

				$("#results").show();
				DISCOU.status.done();

				// for each result start a queue for loading previews (to save time)
				var delay = 500;
				$("#results .result").each(function(){
					var result_id = $(this).attr("id");
					var preloadPreview = function() {
						if($("#"+result_id).hasClass("result-unit") || (!$("#"+result_id).hasClass("result-article"))){
							// do nothing
							return;
						}
						DISCOU.preview(result_id);
					};
					setTimeout(preloadPreview, delay);
					delay = delay + 1000;
				});
			});
		}),
		init : (function(){
			
			// User change input
			$("#input-text").bind("textchange", (function(){
				$("#button-discover").removeAttr("disabled");
				DISCOU.cacheInput("save");
			}));
			
			// User press Discover!
			$("#button-discover").click(function(){
				
				var inputt = $("#input-text").val();
				
				if( (!inputt) || inputt.trim() == "" ){
					return;
				}
				
				// working
				DISCOU.status.working();
				
				// clear entities and results
				$("#results").empty();
				
				urn = DISCOU.identify(inputt);
				if(DISCOU.behaviour.lastInput !== null){
					if(inputt == DISCOU.behaviour.lastInput){
						DISCOU.behaviour.index(urn);
						DISCOU.behaviour.lastInput = inputt;
						return;
					}

				}
				$("#entities").empty();
				DISCOU.behaviour.lastInput = inputt;
				DISCOU.behaviour.entities(inputt);					
			});
		})
	};
})();
// register to run when page is ready
$(document).ready(function(){
	
	// TODO Include here check for browser's capabilities...
	DISCOU.behaviour.init();
	DISCOU.cacheInput("restore");
	$("body").fadeIn();
	$("#button-discover, textarea").removeAttr("disabled"); // firefox could remember it is disabled...
});
