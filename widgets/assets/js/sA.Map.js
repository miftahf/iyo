sA.Map = function(arrObj_options) {		
	
	var options = {};
	if (this.isObj(arrObj_options)) {
		options = arrObj_options;
	}
	
	this.name = "Amilna Map";
	if (this.isObj(options.name)) {
		this.name = options.name;
	}
	
	this.id = this.name.toLowerCase().replace(/[^a-zA-Z0-9]/g,"_");		
	
	this.reqUrl = '';
	if (this.isObj(options.reqUrl)) {
		this.reqUrl = options.reqUrl;
	}
	
	this.geom_col = 'the_geom';
	if (this.isObj(options.geom_col)) {
		this.geom_col = options.geom_col;
	}
	
		
	if (this.isObj(options.init)) {
		this.init = options.init;
	}		
	
	this.zooms = [(this.isObj(this.init.zoom)?this.init.zoom:5)];
	this.centers = [(this.isObj(this.init.center)?this.init.center:[117, -2])];
	
	this.minZoom = 0;
	if (this.isObj(options.minZoom)) {
		this.minZoom = options.minZoom;
	}
	
	this.maxZoom = 19;
	if (this.isObj(options.minZoom)) {
		this.minZoom = options.minZoom;
	}					
	
	/* layers config example
	 * [{
	 * 	name:"Layer Name",
	 * 	type:"tile", // tile,geojson,topojson,kml,gpx
	 * 	urls:["https://1.base.maps.api.here.com/maptile/2.1/maptile/newest/normal.day/{z}/{x}/{y}/256/png8?app_id=SqE1xcSngCd3m4a1zEGb&token=r0sR1DzqDkS6sDnh902FWQ&lg=ID"],
	 * 	fields: // fields for hover info
	 * 	[
	 * 		{
	 * 			name:"classname",
	 * 			alias:"Class Name"
	 * 		}
	 * 	], 
	 * 	rules: // only for geojson,topojson,kml,gpx type
	 * 	[
	 * 		filter:"[classname] = 'Class 1'",
	 * 		style: 
	 * 			scale: 0.5,
	 * 			opacity: 0.5,
	 * 			src:"marker-icon.png"
	 * 		})
	 * 	],
	 * 	visible:true,
	 * 	sublayers: ["Name of Sub Layer 1","Name of Sub Layer 2"] // shown when the layers feature is clicked
	 * }]
	 */ 
	this.layers = [];	
	if (this.isObj(options.layers)) {				
		this.layers = options.layers;	
	}
	
	this.baseMaps = [{"name":"Open Street Map","url":'http://[a,b,c].tile.openstreetmap.org/{z}/{x}/{y}.png',"source":"OSM"}];	
	if (this.isObj(options.baseMaps)) {				
		this.baseMaps = options.baseMaps;	
	}
	
	this.baseIndex = 0;	
	if (this.isObj(options.baseIndex)) {				
		this.baseIndex = options.baseIndex;	
	}
	
	this.baseMap = null;
	
	this.utfGrids = [];	
	
	this.highlightStyleCache = {};
	this.featureHighlight = [null,null]; // [feature,layer]			
				
	var closer = $("#" + this.id + " .iyo-popup-closer");
	var popup = $("#" + this.id + " .iyo-popup");
	
	closer.bind("click",function() {
		popup.css("display","none");
		closer.blur();		
		return false;
	});				
	
	this.popup = popup;
	
	this.featureStyle = new ol.style.Style({
		fill: new ol.style.Fill({
		  color: 'rgba(255, 255, 255, 0.2)'
		}),
		stroke: new ol.style.Stroke({
		  color: '#1E90FF',
		  width: 2
		}),
		image: new ol.style.Circle({
		  radius: 4,
		  fill: new ol.style.Fill({
			color: 'rgba(255, 255, 255, 0.2)'
		  }),
		  stroke: new ol.style.Stroke({
			  color: '#1E90FF',
			  width: 3
			})
		})
	  });
	
	this.editorStyle = new ol.style.Style({
		fill: new ol.style.Fill({
		  color: 'rgba(255, 255, 130, 0.2)'
		}),
		stroke: new ol.style.Stroke({
		  color: '#ffcc33',
		  width: 2
		}),
		image: new ol.style.Circle({
		  radius: 4,
		  fill: new ol.style.Fill({
			color: 'rgba(255, 255, 130, 0.2)'
		  }),
		  stroke: new ol.style.Stroke({
			  color: '#ff0000',
			  width: 3
			})
		})
	  });				
	
	var baseMap = this.baseMaps[this.baseIndex];
	var url = baseMap.url;
	
	var m = url.match(/\[([a-zA-Z0-9_\,]+)\]/);			
	if (m != null)
	{				
		var subs = m[1].split(",");
		var urls = [];
		for (var s=0;s<subs.length;s++)
		{
			var u = url.replace("[" + m[1] + "]",subs[s]);			
			urls.push(u);
		}
	}
	else
	{
		urls.push(url);	
	}
	
	var basemap = new ol.layer.Tile({
		name : baseMap.name,
		isbase : true,
		source: new ol.source.XYZ({			
			urls: urls
		})
	}); 
	
	var ovmap = new ol.control.OverviewMap({
		//className: 'ol-overviewmap ol-custom-overviewmap',
	  target:this.id + "-iyo-inset",
	  collapsed:false,
	  //collapsible:false,
	  layers:[basemap]
	  
	});
	
	this.map = new ol.Map({
		//interactions: ol.interaction.defaults().extend([select, modify]),	
		view: new ol.View({
			center: ol.proj.transform(this.centers[0],
			  "EPSG:4326","EPSG:3857"),
			zoom: this.zooms[0],
			projection:"EPSG:3857",
			minZoom: this.minZoom,
			maxZoom: this.maxZoom
		}),
		overlays: [
			new ol.Overlay({
				element: popup
			})
		],
		/*
		layers:[
			this.layerEditor
		],
		*/ 
		controls: ol.control.defaults().extend([
		  new ol.control.ScaleLine(),		  
		  ovmap		  
		]),		
		target: this.id + "-iyo-map"
	});			
	
	
	this.featureOverlay = new ol.FeatureOverlay({
		map: this.map,
		style: this.editorStyle
	});
	
	this.layerEditor = null;	
	this.featureOnEdit = null;
	this.param = {};
	
	var map = this.map;
	map.sai = this;		
	
	this.addBaseMap();
	
	for (var l=0;l<this.layers.length;l++)
	{		
		this.addLayer(this.layers[l]);		
	}		
		
	this.mapOCkey = this.map.on("click", function(evt) {
		var sai = this.sai;
		sai.mapOnMouseClick(evt);    
	});				
	
	
	this.initUi();
	
	if (this.isObj(options.callBack))
	{						
		callBack(this);
	}	
	
};
sA.Map.prototype = Object.create(sA.prototype);
sA.Map.prototype.constructor = sA.Map;

sA.Map.prototype.addBaseMap = function() {	
	
	for (var b=0;b<this.baseMaps.length;b++)
	{
		var baseMap = this.baseMaps[b];
		var url = baseMap.url;
		
		var m = url.match(/\[([a-zA-Z0-9_\,]+)\]/);			
		if (m != null)
		{				
			var subs = m[1].split(",");
			var urls = [];
			for (var s=0;s<subs.length;s++)
			{
				var u = url.replace("[" + m[1] + "]",subs[s]);			
				urls.push(u);
			}
		}
		else
		{
			urls.push(url);	
		}
		
		var layer = new ol.layer.Tile({
			name : baseMap.name,
			isbase : true,
			source: new ol.source.XYZ({			
				urls: urls
			})
		});
		
		layer.conf = baseMap;
		layer.setVisible(this.baseIndex == b);
		
		this.map.addLayer(layer);		
		this.initUiBaseMap(layer);
		
		if (this.baseIndex == b)
		{
			this.baseMap = layer;	
			$("#" + this.id +" .iyo-basemap-preview").removeClass("iyo-base-show");
			var layid = "layer_"+baseMap.name.toLowerCase().replace(/[^a-zA-Z0-9]/g,"_");
			$("#" + layid +" .iyo-basemap-preview").addClass("iyo-base-show");
		}		
		
	}		
};

sA.Map.prototype.addLayer = function(lconf) {	
		
	if (lconf.type == "tile")
	{
		var layer = new ol.layer.Tile({
			name : lconf.name,	
			isbase : false,
			source: new ol.source.XYZ({			
				urls: lconf.urls
			})
		});		
		layer.conf = lconf;
		layer.setVisible(this.isObj(lconf.visible)?lconf.visible:true);
		layer.setOpacity(this.isObj(lconf.opacity)?lconf.opacity:1);
		
		this.map.addLayer(layer);		
		this.initUiLayer(layer);
		this.initUiLegend(layer);
		
		if (this.isObj(lconf.fields))
		{
			if (lconf.fields.length > 0)
			{
				var urls = [];
				for (var u=0;u<lconf.urls.length;u++)
				{
					urls.push(lconf.urls[u].replace(".png",".json"));
				}
				
				var utfGrid = new ol.utfGrid({
					name: lconf.name,								
					urls: urls
				});
				
				utfGrid.layer = layer;
				utfGrid.onMove = this.mapOnMouseMove;
				utfGrid.startEvent = this.wait;
				utfGrid.finishEvent = this.unwait;
				utfGrid.addTo(this.map);
				
				this.utfGrids.push(utfGrid);
				layer.utfGrid = utfGrid;				
			}
		}		
	}
	else if	(lconf.type == "geojson")
	{
		var urls = lconf.urls;
		var isjson = false;
		if (urls[0].replace(".json") != urls[0])
		{
			isjson = true;
			
			var source = new ol.source.Vector({
				features: []
			});												
		}
		else
		{
			var source = new ol.source.GeoJSON({
				'projection': this.map.getView().getProjection(),
				'url': urls[0]
			});	
		}				
		
		var sai = this;
		var olayer = new ol.layer.Vector({name : lconf.name});
		olayer.conf = lconf;
		
		var layer = new ol.layer.Vector({
			name : lconf.name,
			source : source,
			style : function(feature, resolution) {
						return [sai.mkStyle(feature,olayer)];						
				}	
		});	
		layer.conf = lconf;
		layer.setVisible(this.isObj(lconf.visible)?lconf.visible:true);
		layer.setOpacity(this.isObj(lconf.opacity)?lconf.opacity:1);
		
		this.map.addLayer(layer);		
		this.initUiLayer(layer);
		this.initUiLegend(layer);
		
		if (lconf.fields.length > 0 && isjson)
		{						
			var utfGrid = new ol.utfGrid({
				name: lconf.name,								
				urls: urls,
				render:true,
				base:(this.isObj(lconf.resolution)?256/parseInt(lconf.resolution):64)
			});
			
			utfGrid.layer = layer;
			utfGrid.onMove = this.mapOnMouseMove;
			utfGrid.startEvent = this.wait;
			utfGrid.finishEvent = this.unwait;
			utfGrid.addTo(this.map);
			
			this.utfGrids.push(utfGrid);
			layer.utfGrid = utfGrid;			
		}
		
	}
};

sA.Map.prototype.initUiBaseMap = function(layer) {	
		
	var map = this.map;
	var lconf = layer.conf;
	
	var url = lconf.url;		
	var m = url.match(/\[([a-zA-Z0-9_\,]+)\]/);			
	if (m != null)
	{				
		var subs = m[1].split(",");
		var urls = [];
		for (var s=0;s<subs.length;s++)
		{
			var u = url.replace("[" + m[1] + "]",subs[s]);			
			urls.push(u);
		}
	}
	else
	{
		urls.push(url);	
	}
	
	var layid = "layer_"+lconf.name.toLowerCase().replace(/[^a-zA-Z0-9]/g,"_");
	var html = $("#iyo-template-uibasemap").html();
	html = html.replace("{id}",layid);
	html = html.replace("{name}",lconf.name);
	html = html.replace('{img src="{url}" }','<img src="{url}" >');					
	html = html.replace("{url}",urls[0]);
	html = html.replace("{z}",6);
	html = html.replace("{x}",53);
	html = html.replace("{y}",32);
	
	$("#" + map.sai.id +" .iyo-basemaps").prepend(html);
		
	$("#" + layid +" .iyo-basemap-preview").bind("click",function(){
		var basemap = map.sai.baseMap;
		basemap.setVisible(false);
		
		map.sai.baseMap = layer;
		map.sai.baseMap.setVisible(true);		
		
		$("#" + map.sai.id +" .iyo-basemap-preview").removeClass("iyo-base-show");
		$("#" + layid +" .iyo-basemap-preview").addClass("iyo-base-show");
	});			
};	

sA.Map.prototype.initUiLegend = function(layer) {	
	var map = this.map;	
	var lconf = layer.conf;
	var layid = "layer_"+lconf.name.toLowerCase().replace(/[^a-zA-Z0-9]/g,"_");
	
	if (this.isObj(lconf.rules))
	{
		for (var r=0;r<lconf.rules.length;r++)
		{
			var rule = lconf.rules[r];
			var html = $("#iyo-template-uilayerclass").html();
			html = html.replace("{cid}",layid+"_class_"+r);			
			html = html.replace("{class}",this.isObj(rule.name)?rule.name:lconf.name);
			//console.log(html);			
			$("#" + layid +" .iyo-layer-classes").append(html);
			
			if (this.isObj(rule.polygonSymbolizer))
			{
				var fill = this.isObj(rule.polygonSymbolizer.fill)?rule.polygonSymbolizer.fill:"inherit";
				var fillOpacity = this.isObj(rule.polygonSymbolizer.fillOpacity)?rule.polygonSymbolizer.fillOpacity:"inherit";								
								
				if (this.inArray(lconf.geomtype,['Polygon','MultiPolygon']) >= 0)
				{
					$("#" + layid+"_class_"+r+ " .iyo-layer-class-symbol-fill").css({"backgroundColor":fill,"opacity":parseFloat(fillOpacity),"height":"20px"});
				}
				else if (this.inArray(lconf.geomtype,['LineString','MultiLineString']) >= 0)
				{
					$("#" + layid+"_class_"+r+ " .iyo-layer-class-symbol-fill").css({"backgroundColor":fill,"opacity":parseFloat(fillOpacity),"height":"12px"});
				}
			}
			
			if (this.isObj(rule.lineSymbolizer))
			{
				var stroke = this.isObj(rule.lineSymbolizer.stroke)?rule.lineSymbolizer.stroke:"inherit";
				var strokeOpacity = this.isObj(rule.lineSymbolizer.strokeOpacity)?rule.lineSymbolizer.strokeOpacity:"inherit";								
				var strokeWidth = this.isObj(rule.lineSymbolizer.strokeWidth)?rule.lineSymbolizer.strokeWidth:"inherit";								
				
				if (this.inArray(lconf.geomtype,['Polygon','MultiPolygon']) >= 0)
				{
					$("#" + layid+"_class_"+r+ " .iyo-layer-class-symbol-stroke").css({"borderColor":stroke,"opacity":parseFloat(strokeOpacity),"borderWidth":parseInt(strokeWidth),"height":"20px"});
				}
				else if (this.inArray(lconf.geomtype,['LineString','MultiLineString']) >= 0)
				{					
					$("#" + layid+"_class_"+r+ " .iyo-layer-class-symbol-stroke").css({"borderBottomColor":stroke,"opacity":parseFloat(strokeOpacity),"borderBottomWidth":parseInt(strokeWidth),"height":"12px"});					
				}
			}
			
			if (this.isObj(rule.style))
			{
				var scale = this.isObj(rule.style.scale)?rule.style.scale:false;
				var opacity = this.isObj(rule.style.opacity)?rule.style.opacity:1;								
				var src = this.isObj(rule.style.src)?rule.style.src:false;								
				var strokeWidth = this.isObj(rule.style.strokeWidth)?rule.style.strokeWidth:false;
				var strokeColor = this.isObj(rule.style.strokeColor)?rule.style.strokeColor:false;
				var fillColor = this.isObj(rule.style.fillColor)?rule.style.fillColor:false;								
				var rc = r;
				
				//console.log(rule.style,lconf.geomtype);
				
				if (this.inArray(lconf.geomtype,['Point','MultiPoint']) >= 0)
				{					
					var newImg = new Image();					
					newImg.onload = function(){
						var h = newImg.height*scale;	
						var w = newImg.width*scale;		
									
						var img = '<img src="'+rule.style.src+'" width='+w+' height='+h+' style="opacity:'+opacity+';margin:auto;display:block;"/>';						
						$("#" + layid+"_class_"+rc+ " .iyo-layer-class-symbol-fill").html(img);
					};
					newImg.src = rule.style.src;										
				}
				else if (this.inArray(lconf.geomtype,['Polygon','MultiPolygon']) >= 0)
				{
					$("#" + layid+"_class_"+r+ " .iyo-layer-class-symbol-fill").css({"backgroundColor":fillColor,"opacity":parseFloat(opacity),"height":"20px"});
					$("#" + layid+"_class_"+r+ " .iyo-layer-class-symbol-stroke").css({"borderColor":strokeColor,"opacity":parseFloat(opacity),"borderWidth":parseInt(strokeWidth),"height":"20px"});
				}
				else if (this.inArray(lconf.geomtype,['LineString','MultiLineString']) >= 0)
				{
					$("#" + layid+"_class_"+r+ " .iyo-layer-class-symbol-fill").css({"backgroundColor":fillColor,"opacity":parseFloat(opacity),"height":"12px"});										
					$("#" + layid+"_class_"+r+ " .iyo-layer-class-symbol-stroke").css({"borderBottomColor":strokeColor,"opacity":parseFloat(opacity),"borderBottomWidth":parseInt(strokeWidth),"height":"12px"});
				}
			}
		}	
	
	}
};	

sA.Map.prototype.initUiLayer = function(layer) {	
	
	var map = this.map;
	
	var lconf = layer.conf;
	
	var layid = "layer_"+lconf.name.toLowerCase().replace(/[^a-zA-Z0-9]/g,"_");
	var html = $("#iyo-template-uilayer").html();
	html = html.replace("{id}",layid);
	html = html.replace("{name}",lconf.name);
	
	$(".iyo-layers").prepend(html);
	
	$("#" + layid +" .iyo-layer-legend").bind("click",function(e){		
				
		if ($("#" + layid +" .iyo-layer-tools-seemore").css("display") == "none")
		{
			$("#" + layid +" .iyo-layer-tools-seemore").css("display","block");
			$("#" + layid +" .iyo-layer-tools-visibility").css("display","block");
			$("#" + layid +" .iyo-layer-name").css("fontWeight","bold");
		}
		else
		{
			$("#" + layid +" .iyo-layer-tools-seemore").css("display","none");
			$("#" + layid +" .iyo-layer-tools-visibility").css("display","none");
			$("#" + layid +" .iyo-layer-name").css("fontWeight","normal");
		}
		
		e.stopPropagation();
	});
	
	$("#" + layid ).bind("mouseover",function(e){
		$("#" + layid +" .iyo-layer-tools-seemore").css("display","block");
		$("#" + layid +" .iyo-layer-tools-visibility").css("display","block");
		$("#" + layid +" .iyo-layer-name").css("fontWeight","bold");
	});	
	
	$("#" + layid ).bind("mouseout",function(e){
		$("#" + layid +" .iyo-layer-tools-seemore").css("display","none");
		$("#" + layid +" .iyo-layer-tools-visibility").css("display","none");
		$("#" + layid +" .iyo-layer-name").css("fontWeight","normal");
	});	
	
	$("#" + layid +" .iyo-layer-tools-seemore").bind("click",function(e){		
		
		if ($("#" + layid +" .iyo-layer-tools").css("display") == "none")
		{
			$("#" + map.sai.id + " .iyo-layer-tools").css("display","none");		
			$("#" + map.sai.id + " .iyo-layer").removeClass("iyo-layer-show");
		
			$("#" + layid +" .iyo-layer-tools").css("display","block");		
			$("#" + layid).addClass("iyo-layer-show");
			$("#" + layid +" .iyo-layer-tools-seemore").addClass("iyo-box-show");
		}
		else
		{
			$("#" + layid +" .iyo-layer-tools").css("display","none");		
			$("#" + layid).removeClass("iyo-layer-show");
			$("#" + layid +" .iyo-layer-tools-seemore").removeClass("iyo-box-show");
		}				
		
		e.stopPropagation();
	});
	
	$("#" + layid +" .iyo-layer-tools-seemore").bind("mouseover",function(e){
		//map.sai.param['layerMouseOver'] = layid;
		//setTimeout(function () {		
			//if (map.sai.isObj(map.sai.param['layerMouseOver']))
			//{
			//	if (map.sai.param['layerMouseOver'] == layid)
			//	{
					$("#" + layid +" .iyo-layer-tools").css("display","block");		
					$("#" + layid).addClass("iyo-layer-show");	
					$("#" + layid +" .iyo-layer-tools-seemore").addClass("iyo-box-show");							
			//	}	
			//}			
		//}, 0);
	});
	
	$("#" + layid +"").bind("mouseleave",function(){
				
	
		$("#" + layid +" .iyo-layer-tools").css("display","none");		
		$("#" + layid).removeClass("iyo-layer-show");
		$("#" + layid +" .iyo-layer-tools-seemore").removeClass("iyo-box-show");
		
		var act = $("#" + map.sai.id + " .iyo-layer-tools").find(".iyo-layer-tools-editor.iyo-box-show");
		
		if (act.length > 0)
		{
			act.parent().parent().css("display","block");		
			act.parent().parent().parent().addClass("iyo-layer-show");
			act.parent().parent().parent().find(".iyo-layer-tools-seemore").addClass("iyo-box-show");
		}

	
	});
	
	var lyrvis = true;
	if (this.isObj(lconf.visible))
	{
		if (!lconf.visible)
		{
			lyrvis = false;
		}			
	}
	
	if (lyrvis)
	{
		$("#" + layid +" .iyo-layer-legend").removeClass("iyo-box-unshow");
		$("#" + layid +" .iyo-layer-legend").removeClass("noprint");
		$("#" + layid +" .iyo-layer-classes").removeClass("hidden");
		$("#" + layid +" .iyo-layer-tools-visibility").addClass("iyo-box-show");
	}
	else
	{
		$("#" + layid +" .iyo-layer-legend").addClass("iyo-box-unshow");
		$("#" + layid +" .iyo-layer-legend").addClass("noprint");
		$("#" + layid +" .iyo-layer-classes").addClass("hidden");
		$("#" + layid +" .iyo-layer-tools-visibility").removeClass("iyo-box-show");
	}	
	
	$("#" + layid +" .iyo-layer-tools-visibility").click(function(e){				
		layer.setVisible(!layer.getVisible());
		if (layer.getVisible())
		{
			$("#" + layid +" .iyo-layer-legend").removeClass("iyo-box-unshow");
			$("#" + layid +" .iyo-layer-legend").removeClass("noprint");
			$("#" + layid +" .iyo-layer-classes").removeClass("hidden");
			$("#" + layid +" .iyo-layer-tools-visibility").addClass("iyo-box-show");
			if (map.sai.isObj(layer.utfGrid))
			{
				var evt = {map:map};
				layer.utfGrid.fetch(evt);
			}
		}
		else
		{
			$("#" + layid +" .iyo-layer-legend").addClass("iyo-box-unshow");
			$("#" + layid +" .iyo-layer-legend").addClass("noprint");
			$("#" + layid +" .iyo-layer-classes").addClass("hidden");
			$("#" + layid +" .iyo-layer-tools-visibility").removeClass("iyo-box-show");
		}		
		e.stopPropagation();
	});
	
	
	$("#" + layid +" .iyo-layer-tools-opacity").slider({
		value:(layer.getOpacity()*100),
		slide: function( event, ui ) {			
			layer.setOpacity((ui.value/100));			
		}
	});
	
	if (this.isObj(lconf.dataId) && !this.isObj(lconf.dataquery))
	{
		$("#" + layid +" .iyo-layer-tools-editor").on('click',function(e){
			
			var button = this;		
			
			if (map.sai.layerEditor != null)
			{						
				var data = { _csrf : csrfToken};
				var fs = map.sai.layerEditor.getSource().getFeatures();
				var delfeatures = [];
				var modfeatures = [];
				
				for (var i=0;i<fs.length;i++)
				{
					var f = fs[i];
					
					if (f.get('isModified'))
					{
						//var d = data;
						for (key in f.getProperties())
						{
							if (key != 'geometry')
							{
								data['records['+f.getId()+']['+key+']'] = f.get(key);												
							}
						}											
						var g = f.getGeometry();
						var geojson = new ol.format.GeoJSON();							
						var geometry = geojson.writeGeometry(g,{dataProjection:"EPSG:4326",featureProjection:"EPSG:3857"});
						
						data['records['+f.getId()+'][geometry]'] = geometry;						
						
						if (f.getId() < 0)
						{
							delfeatures.push(f);	
						}
						modfeatures.push(f);	
					}
				}						
				
				if (modfeatures.length > 0)
				{			
					var elayer = map.sai.select[0];
					var elconf = elayer.conf;
					var btml = $("#iyo-template-changeconfirmbutton").html();
					btml = btml.replace("{cid}",elconf.dataId);
					btml = btml.replace("{sid}",elconf.dataId);				
					$("#iyo-modal-layer-confirm .modal-body").html(btml);
					$("#layer-changes-cancel-"+elconf.dataId).click(function(){				
						for (var i=0;i<modfeatures.length;i++)
						{
							var ef = modfeatures[i];								
							map.sai.layerEditor.getSource().removeFeature(ef);
						}
						
						var evt = {map:map};						
						elayer.utfGrid.fetch(evt,true);
						
						if (map.sai.isObj(map.sai.featureOnEdit))
						{
							if (map.sai.featureOnEdit != null && map.sai.layerEditor != null)
							{								
								map.sai.unHighlightFeature([map.sai.featureOnEdit,map.sai.layerEditor]);
							}					
						}
								
						toogleEditor(button);
						$("#iyo-modal-layer-confirm").modal("hide");
					});
					$("#layer-changes-save-"+elconf.dataId).click(function(){
						
						//console.log(fs);
						map.sai.wait();																
						//console.log(data);	
						
						var parseUrl = function (tileCoords, pixelRatio, projection) {
							var d = new Date();
							var n = d.getTime();
							var url = elayer.conf.urls[0]+"?r="+n;
														
							
							url = url.replace('{z}', tileCoords[0] || 0);
							url = url.replace('{x}', tileCoords[1] || 0);
							url = url.replace('{y}', tileCoords[2] || 0);
												
							elayer.utfGrid.data = [];
							return url;
						};
								
						map.sai.xhr(map.sai.reqUrl + "/iyo/record/rest/?data=" + elconf.dataId +"&id=" + 0 ,function(jsonString){
							var res = JSON.parse(jsonString);			
							if (res.status)
							{
								
								var d = new Date();
								var n = d.getTime();		
								var url = elayer.conf.urls[0];					
								url = url.replace(/\?r\=(\d+)/g,"");
								url = url.replace(/\/\{z\}\/\{x\}\/\{y\}\.png/g,"");
								url = url+"?r="+n;				
								map.sai.xhr(url ,function(){
									
								});	
								
								
								if (map.sai.isObj(elayer.getSource().setTileUrlFunction))
								{								
									elayer.getSource().setTileUrlFunction(parseUrl);				
								}
								else
								{	
									delete elayer.utfGrid.data[map.getView().getZoom()];							
								}
								
								for (var i=0;i<delfeatures.length;i++)
								{
									var ef = delfeatures[i];								
									map.sai.layerEditor.getSource().removeFeature(ef);
								}
								//elayer.getSource().clear();	
								var evt = {map:map};
								elayer.utfGrid.fetch(evt,true);
								
								if (map.sai.isObj(map.sai.featureOnEdit))
								{
									if (map.sai.featureOnEdit != null)
									{										
										map.sai.unHighlightFeature([map.sai.featureOnEdit,map.sai.layerEditor]);
									}					
								}
								
								$("#" + map.sai.id +" .iyo-attributes-message").css("display","block");
								$("#" + map.sai.id +" .iyo-attributes-fields").html("");
								
								toogleEditor(button);
								$("#iyo-modal-layer-confirm").modal("hide");
							}	
							map.sai.unwait();
						},function(){map.sai.unwait();$("#iyo-modal-layer-confirm").modal("hide");},[],'POST',data);								
					});			
					$("#iyo-modal-layer-confirm").modal("show");
				}
				else
				{
					toogleEditor(button);	
				}			
			}
			else
			{
				toogleEditor(button);	
			}
			e.stopPropagation();
		});		
	}	
	else
	{
		$("#" + layid +" .iyo-layer-tools-editor").removeClass("iyo-tool");
		$("#" + layid +" .iyo-layer-tools-editor").addClass("iyo-notool");
	}
	
	var toogleEditor = function(div) {	
		
		if (map.sai.isObj(map.sai.draw))
		{			
			map.sai.select[1].getFeatures().clear();
			map.removeInteraction(map.sai.select[1]);
			delete map.sai['select'];
		}
		if (map.sai.isObj(map.sai.draw))
		{				
			map.removeInteraction(map.sai.draw[1]);			
			delete map.sai['draw'];									
		}		
		if (map.sai.isObj(map.sai.modify))
		{
			map.removeInteraction(map.sai.modify);			
			delete map.sai.modify;			
		}
		
		if (map.sai.featureOnEdit != null && map.sai.layerEditor != null)
		{			
			map.sai.unHighlightFeature([map.sai.featureOnEdit,map.sai.layerEditor],true);
			map.sai.featureOnEdit = null;
		}
		
		if (map.sai.layerEditor != null)
		{			
			
			if (!map.sai.isObj(map.sai.layerEditor.get('name')))
			{
				map.removeLayer(map.sai.layerEditor);
			}						
			map.sai.layerEditor = null;										
		}				
		
		if (!$(div).hasClass('iyo-box-show'))
		{
			$("#" + map.sai.id +" .iyo-layer-tools-editor").removeClass('iyo-box-show');
			$(div).addClass('iyo-box-show');			
			$("#" + map.sai.id +" .ol-viewport").css('cursor','crosshair');
			
			$("#" + map.sai.id + " .iyo-layer-tools").css("display","none");		
			$("#" + map.sai.id + " .iyo-layer").removeClass("iyo-layer-show");
		
			$("#" + layid +" .iyo-layer-tools").css("display","block");		
			$("#" + layid).addClass("iyo-layer-show");												
		}
		else
		{
			$("#" + map.sai.id +" .iyo-layer-tools-editor").removeClass('iyo-box-show');			
			$("#" + map.sai.id +" .ol-viewport").css('cursor','auto');			
			
			$("#" + layid +" .iyo-layer-tools").css("display","none");		
			$("#" + layid).removeClass("iyo-layer-show");
			
			$("#" + map.sai.id +" .iyo-attributes-message").css("display","block");
			$("#" + map.sai.id +" .iyo-attributes-fields").html("");
		}		
		
		if (map.sai.isObj(lconf.geomtype) && $(div).hasClass('iyo-box-show'))
		{			
						
			if (map.sai.inArray(lconf.type,['geojson']) >= 0)
			{
				var source = layer.getSource();
				map.sai.layerEditor = layer;
			}
			else
			{
				var source = new ol.source.Vector({wrapX: false});
				map.sai.layerEditor = new ol.layer.Vector({
				  source: source,
				  style: map.sai.featureStyle				  
				});
				map.addLayer(map.sai.layerEditor);				
			}
					
			map.sai.select = [layer,new ol.interaction.Select({				
				source: source,
				type: lconf.geomtype,
				style: map.sai.editorStyle,
				toggleCondition:  function(event) {
					
					return ol.events.condition.shiftKeyOnly(event) &&
						ol.events.condition.singleClick(event);
						
				}
			})];
			
			map.sai.select[1].on('select',function() {				
				var fs = map.sai.select[1].getFeatures().getArray();
				var f = fs[0];
				if (map.sai.isObj(f))
				{					
					map.sai.initUiAttributes(f,layer);
				}	
				
			});	
			
			var selected_features = map.sai.select[1].getFeatures();
			// when a feature is selected...
			selected_features.on('add', function (event) {
				// get the feature
				var feature = event.element;
				feature.once("change", function (event) {
					event.target.set('isModified',true);
				});
			});			
						
			map.sai.draw = [layer,new ol.interaction.Draw({								
				source: source,
				type: lconf.geomtype,
				style: new ol.style.Style({												
						stroke: map.sai.editorStyle.getStroke(),
						fill: map.sai.editorStyle.getFill()
					})
			}),false,true];
			
			map.sai.draw[1].on('drawstart',function() {				
							
				if (lconf.geomtype != 'Point')
				{
					map.sai.select[1].getFeatures().clear();
					$("#" + map.sai.id +" .iyo-attributes-message").css("display","block");
					$("#" + map.sai.id +" .iyo-attributes-fields").html("");
					map.sai.draw[2] = true;
				}
				
			});	
			
			map.sai.draw[1].on('drawend',function(e) {								
												
				map.sai.draw[2] = false;				
				
				var d = new Date();
				var n = d.getTime()+"";
				e.feature.setId(parseInt(n.substr(6))*(-1));
				e.feature.set('isModified',true);
				e.feature.set('gid',e.feature.getId());								
								
							
				if (map.sai.draw[3])
				{					
					map.sai.initUiAttributes(e.feature,layer);						
				}
				else
				{										
					if (map.sai.isObj(e.feature))
					{						
						setTimeout(function () {
							var delf = map.sai.layerEditor.getSource().getFeatureById(e.feature.getId());										
							if (delf != null)
							{							
								map.sai.layerEditor.getSource().removeFeature(delf);							
							}
						},100);
						
					}					
				}
				
				map.sai.draw[3] = true;				
				
			});	
				
						
			map.addInteraction(map.sai.draw[1]);
			map.addInteraction(map.sai.select[1]);
			
			map.sai.modify = new ol.interaction.Modify({							
			    features: map.sai.select[1].getFeatures(),				
				style: map.sai.editorStyle,
				// the SHIFT key must be pressed to delete vertices, so
				// that new vertices can be drawn at the same position
				// of existing vertices
				
				deleteCondition: function(event) {
					
					return ol.events.condition.shiftKeyOnly(event) &&
						ol.events.condition.singleClick(event);
						
				}
				
			});						
			
			map.addInteraction(map.sai.modify);
			 
		}
		
	};
};	

sA.Map.prototype.initUiAttributes = function(f,layer) {	
		
	var gid = !this.isObj(f.getId())?null:f.getId();	
	
	if (gid == null)
	{
		return;
	}
	
	var props = f.getProperties();
	//console.log(props);
	
	var map = this.map;	
	var lconf = layer.conf;		
	
	if (map.sai.layerEditor != null && map.sai.featureOnEdit !=  null)
	{
		map.sai.unHighlightFeature([map.sai.featureOnEdit,map.sai.layerEditor],true);	
	}
	
	map.sai.featureOnEdit = f;
	
	map.sai.select[1].getFeatures().clear();
	map.sai.select[1].getFeatures().push(f);	
	
	if (map.sai.isObj(map.sai.layerEditor.get('name')))
	{
		map.sai.highlightFeature(f,layer);
	}			
	
	var layid = "layer_"+lconf.name.toLowerCase().replace(/[^a-zA-Z0-9]/g,"_");	
	
	var geom = f.getGeometry();	
	if (geom.getType() == "Polygon" || geom.getType() == "MultiPolygon")
	{
		var meas = this.formatArea(f.getGeometry());
	}
	else if (geom.getType() == "LineString" || geom.getType() == "MultiLineString")
	{	
		var meas = this.formatLength(f.getGeometry());
	}
	else
	{
		var meas = ol.coordinate.toStringHDMS(ol.proj.transform(
			geom.getCoordinates(), "EPSG:3857", "EPSG:4326"));
	}	
	
	$("#" + map.sai.id +" .iyo-attributes-message").css("display","none");		
	$("#" + map.sai.id +" .iyo-attributes-fields").html("<div class='iyo-feature-measure'>" + meas+" </div>");
	
	if (this.isObj(lconf.data))
	{
		for (var k = 0;k<lconf.data.length;k++)
		{
			var dt = lconf.data[k];
			var key = dt['name'];
			
			//f.set(key,this.isObj(props[key])?props[key]:'');
			
			var id = layid + "-" + gid + "-" + key;
			//var name = "Attributes[" + key + "]";
			var name = key;
			var label = dt['alias'];
			var html = $("#iyo-template-uiattribute").html();
			html = html.replace("{lid}",id);
			html = html.replace("{did}",id);
			html = html.replace("{name}",name);
			html = html.replace("{label}",label);
			html = html.replace("{value}",(this.isObj(props[key])?props[key]:dt['default']));		
			
			if (!this.isObj(props[key]))
			{
				f.set(key,dt['default']);	
			}
					
			$("#" + map.sai.id +" .iyo-attributes-fields").append(html);			
		}		
	}
	else
	{		
		for (key in props)
		{	
			if (key != "geometry" && key != "isModified")
			{
				var id = layid + "-" + gid + "-" + key;
				//var name = "Attributes[" + key + "]";
				var name = key;
				var label = key;
				var html = $("#iyo-template-uiattribute").html();
				html = html.replace("{lid}",id);
				html = html.replace("{did}",id);
				html = html.replace("{name}",name);
				html = html.replace("{label}",label);
				html = html.replace("{value}",props[key]);		
						
				$("#" + map.sai.id +" .iyo-attributes-fields").append(html);
			}
		}
	}
	
	$("#" + map.sai.id +" .iyo-attributes-fields .form-control").change(function(){
		//console.log(gid);
		var df = map.sai.layerEditor.getSource().getFeatureById(gid);
		var key = $(this).attr("name");
		df.set(key,$(this).val());
		df.set('isModified',true);
	});
	
	var btml = $("#iyo-template-uiattributebutton").html();
	btml = btml.replace("{lid}",gid);
	btml = btml.replace("{did}",gid);
	btml = btml.replace("{cid}",gid);
	$("#" + map.sai.id +" .iyo-attributes-fields").append(btml);
	
	var parseUrl = function (tileCoords, pixelRatio, projection) {
		var d = new Date();
		var n = d.getTime();
		var url = layer.conf.urls[0]+"?r="+n;
		
		url = url.replace('{z}', tileCoords[0] || 0);
		url = url.replace('{x}', tileCoords[1] || 0);
		url = url.replace('{y}', tileCoords[2] || 0);				
		
		layer.utfGrid.data = [];
		return url;
	};
	
	$("#save-" + gid ).click(function(){
		map.sai.wait();
		var data = { _csrf : csrfToken};
		$("#" + map.sai.id +" .iyo-attributes-fields .form-control").each(function(d,D) {
			var key = $(D).attr("name");
			var val = $(D).val();
			data[key] = val;
			
			f.set(key,val);
		});
		f.unset('isModified');		
				
		var g = f.getGeometry();
		var geojson = new ol.format.GeoJSON();							
		var geometry = geojson.writeGeometry(g,{dataProjection:"EPSG:4326",featureProjection:"EPSG:3857"});				
		data['geometry'] = geometry;		
				
		map.sai.xhr(map.sai.reqUrl + "/iyo/record/rest/?data=" + lconf.dataId +"&id=" + gid ,function(jsonString){
								
			var res = JSON.parse(jsonString);			
			if (res.status)
			{
				var d = new Date();
				var n = d.getTime();		
				var url = layer.conf.urls[0];					
				url = url.replace(/\?r\=(\d+)/g,"");
				url = url.replace(/\/\{z\}\/\{x\}\/\{y\}\.png/g,"");
				url = url+"?r="+n;				
				map.sai.xhr(url ,function(){
					
				});	
				
				if (map.sai.isObj(map.sai.featureOnEdit))
				{
					if (map.sai.featureOnEdit != null)
					{						
						map.sai.unHighlightFeature([map.sai.featureOnEdit,map.sai.layerEditor]);							
						map.sai.featureOnEdit = null;
					}					
				}
												
				map.sai.select[1].getFeatures().clear();				
				f.setId(res.gid);				
				//f.set('isModified',false);
				//layer.getSource().changed();
				
				if (map.sai.isObj(layer.getSource().setTileUrlFunction))
				{								
					layer.getSource().setTileUrlFunction(parseUrl);				
				}
				else
				{	
					delete layer.utfGrid.data[map.getView().getZoom()];
				}	
				var evt = {map:map};
				layer.utfGrid.fetch(evt,true);
				
				$("#" + map.sai.id +" .iyo-attributes-message").css("display","block");
				$("#" + map.sai.id +" .iyo-attributes-fields").html("");
			}
			map.sai.unwait();
											
		},function(){map.sai.unwait();},[],'POST',data);
		
	});
	
	$("#delete-" + gid ).click(function(){
		map.sai.wait();
		var data = { _csrf : csrfToken};
		map.sai.xhr(map.sai.reqUrl + "/iyo/record/rest/?data=" + lconf.dataId +"&id=" + gid ,function(jsonString){
								
			var res = JSON.parse(jsonString);			
			if (res.status)
			{				
				
				var d = new Date();
				var n = d.getTime();		
				var url = layer.conf.urls[0];					
				url = url.replace(/\?r\=(\d+)/g,"");
				url = url.replace(/\/\{z\}\/\{x\}\/\{y\}\.png/g,"");
				url = url+"?r="+n;				
				map.sai.xhr(url ,function(){
					
				});	
				
				try {
					var f = map.sai.layerEditor.getSource().getFeatureById(gid);
					map.sai.layerEditor.getSource().removeFeature(f);
				}
				catch (e) {}								
				
				map.sai.featureOnEdit = null;
				
				map.sai.select[1].getFeatures().clear();
				//layer.getSource().changed();											
				if (map.sai.isObj(layer.getSource().setTileUrlFunction))
				{								
					layer.getSource().setTileUrlFunction(parseUrl);				
				}
				else
				{	
					delete layer.utfGrid.data[map.getView().getZoom()];
				}
				var evt = {map:map};
				layer.utfGrid.fetch(evt,true);
				
				$("#" + map.sai.id +" .iyo-attributes-message").css("display","block");
				$("#" + map.sai.id +" .iyo-attributes-fields").html("");
			}
			map.sai.unwait();
											
		},function(){
			try {
				map.sai.layerEditor.getSource().removeFeature(f);
			}
			catch (e) {
				
			}
			map.sai.select[1].getFeatures().clear();
			$("#" + map.sai.id +" .iyo-attributes-message").css("display","block");
			$("#" + map.sai.id +" .iyo-attributes-fields").html("");
			map.sai.unwait();
		},[],'POST',data);
	});
	
	$("#clean-" + gid ).click(function(){
		if (map.sai.inArray(f.getGeometry().getType(),['Point','MultiPoint']) < 0)
		{
			map.sai.wait();
			var fs = map.sai.layerEditor.getSource().getFeatures();		
			var format = new ol.format.GeoJSON();
			var union = false;
			
			for (var u=0;u<fs.length;u++)
			{
				if (fs[u].getId() != f.getId())
				{
					if (union)
					{
						//console.log(fs[u].getGeometry().getType());
						
						union = format.readFeature(
							turf.union(
								format.writeFeatureObject(union),
								format.writeFeatureObject(fs[u])
							)
						);
					}
					else
					{
						union = fs[u];	
					}
				}
			}		
			
			var clean = format.readFeature(
				turf.erase(
					format.writeFeatureObject(f),
					format.writeFeatureObject(union)
				)
			);				
			map.sai.layerEditor.getSource().removeFeature(f);
			
			clean.setId(gid);
			map.sai.layerEditor.getSource().addFeature(clean);
			
			map.sai.select[1].getFeatures().clear();
			map.sai.select[1].getFeatures().push(clean);
			map.sai.initUiAttributes(clean,layer);
					
			map.sai.unwait();		
		}
	});
	
	if (!$("#" + map.sai.id +" .iyo-edit-attributes").hasClass("iyo-box-show"))
	{
		$("#" + map.sai.id +" .iyo-edit-attributes").click();
	}
	
	if (!$("#" + map.sai.id +" .iyo-nav-tools").hasClass("iyo-box-show"))
	{
		$("#" + map.sai.id +" .iyo-nav-tools").click();
	}
		
};	

sA.Map.prototype.getStyle = function(featureHighlight) {		
	var style = false;	
	var conf = (this.isObj(featureHighlight[1].conf)?featureHighlight[1].conf:false);	
	if (conf)
	{
		if (this.isObj(conf.rules))
		{						
			for (f=0;f<conf.rules.length;f++)
			{
				if (this.isObj(conf.rules[f].filter))
				{
				
					var filter = conf.rules[f].filter.match(/^\[([a-z_]+)\] ([\=\>\<\!]+) \'(.*)\'/);	
					if (filter != null)
					{
						var field = filter[1];
						var operator = filter[2];
						var value = filter[3];
						var value1 = false;
					}
					else
					{
						var filter = conf.rules[f].filter.match(/^\[([a-z_]+)\] (in||not in) \'(\d+)-(\d+)\'/);	
						if (filter != null)
						{
							var field = filter[1];
							var operator = filter[2];
							var value = filter[3];
							var value1 = filter[4];
						}	
					}
					
					if (filter != null)
					{								
						var prop = featureHighlight[0].getProperties();								
						if (!value1)
						{
							for (key in prop)
							{
								if (key == field && (eval(prop[key]+operator+value)))
								{
									style = conf.rules[f].style;
								}
							}	
						}
						else
						{
							for (key in prop)
							{
								if (key == field && (eval(prop[key]+(operator=="in"?">=":"<")+value)) && (eval(prop[key]+(operator=="in"?"<=":">")+value1)))
								{
									style = conf.rules[f].style;
								}
							}
							
						}
					}
				}														
			}
			
			if (!style)
			{
				style = conf.rules[conf.rules.length-1].style;					
			}
																	
		}
	}
			
	return style;
};

sA.Map.prototype.mkStyle = function(feature,layer,isHighlight) {		
	
	var reStyle = false;	
	
	var tk = [];
	for (key in layer)
	{
		tk.push(key);
	}
			
	if (tk.length > 1)
	{				
		if (this.isObj(layer.get('name')))
		{
			reStyle = true;
		}
	}	
	
	if (!reStyle)
	{
		return false;
	}	
	else
	{
		var dstyle = this.getStyle([feature,layer]);
		var scale = dstyle.scale+(this.isObj(isHighlight)?0.3:0);
		var opacity = Math.min(dstyle.opacity+(this.isObj(isHighlight)?0.3:0),1);	
		var label = this.isObj(dstyle.label)?dstyle.label:false;	
		
		var labelAttribute = '';
		if (label)
		{
			labelAttribute = feature.get(label.attribute);
		}
		
		if (this.isObj(dstyle.src))
		{							
			oStyle = new ol.style.Style({
				image : new ol.style.Icon({				
					scale:scale,				
					opacity:opacity,	
					anchor:dstyle.anchor,						
					src:dstyle.src
				}),
				text : label?new ol.style.Text({
					text:labelAttribute,
					font: this.isObj(label.font)?label.font:'12px Calibri,sans-serif',
					offsetX: this.isObj(label.offsetX)?label.offsetX:0,				
					offsetY: this.isObj(label.offsetY)?label.offsetY:0,
					textAlign: this.isObj(label.textAlign)?label.textAlign:'center',
					textBaseline: this.isObj(label.textBaseline)?label.textBaseline:'middle',
					fill: new ol.style.Fill({
						color: this.isObj(label.color)?label.color:'#000',							
					}),
					stroke: new ol.style.Stroke({
						color: this.isObj(label.strokeColor)?label.strokeColor:'#fff',
						width: this.isObj(label.strokeWidth)?label.strokeWidth:1
					})
				}):undefined
			});											
		}
		else
		{
			oStyle = new ol.style.Style();	
		}
		return oStyle;
	}
};

sA.Map.prototype.unHighlightFeature = function(featureHighlight,isforced) {			
	var style = this.mkStyle(featureHighlight[0],featureHighlight[1]);	
	if (style && (featureHighlight[0] != this.featureOnEdit || this.isObj(isforced) ))
	{							
		featureHighlight[0].setStyle(style);
	}
};	


sA.Map.prototype.getUtfGridData = function(evt) {			
	
	var lonlat = ol.proj.transform(evt.coordinate,
				"EPSG:3857", "EPSG:4326");
	
	var sai = evt.map.sai;	
	sai.featureHighlight = evt.map.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {			
		return [feature,layer];
	});		
		
	var feature = null;
	var layer = null;
	if (sai.isObj(sai.featureHighlight))
	{														
		feature = sai.featureHighlight[0];		
		
		if (sai.isObj(feature.getGeometry()))
		{			
			var gtype = feature.getGeometry().getType();
			if (gtype == 'Point')
			{
				lonlat = ol.proj.transform(feature.getGeometry().getCoordinates(),
					"EPSG:3857", "EPSG:4326");			
			}		
		}		
	
		layer = sai.featureHighlight[1];
	}
	else
	{
		sai.featureHighlight = [null,null];	
	}		
	
	if (sai.isObj(sai.draw))
	{						
		var draw = false;		
		if ((feature != null && layer != sai.layerEditor) || feature == null || evt.originalEvent.shiftKey || sai.draw[2])
		{							
			draw = true;			
		}
		
		if (draw)
		{			
			if (!sai.draw[1].getActive())
			{
				sai.draw[1].setActive(true);				
			}
			
			var deselect = true;			
			sai.select[1].setActive(!deselect);	
			
		}
		else
		{						
			sai.draw[1].setActive(false);			
			if (!sai.select[1].getActive())
			{
				sai.select[1].setActive(true);	
			}
		}
	}
	var data = [];
	var utfGrids = evt.map.utfGrids;
		
	for (var g=0;g<utfGrids.length;g++)
	{
		var ug = utfGrids[g];				
		if (!ug.render && ug.layer.getVisible())
		{
			var flonlat = ug.fixLonlat(lonlat);
			var d = ug.getData(flonlat);						
									
			if (d != null)
			{				
				data.push([ug.layer,d]);				
			}			
		}
	}
		
	if (feature != null && sai.isObj(sai.featureHighlight))
	{				
		var prop = feature.getProperties();			
		data.push([sai.featureHighlight[1],prop,feature]);				
	}
	
	return data;				
};	

sA.Map.prototype.highlightFeature = function(feature,layer) {	
	
	this.featureHighlight = [feature,layer];	
	var style = this.mkStyle(feature,layer,true);		
	if (style)
	{							
		feature.setStyle(style);
	}

	return this.featureHighlight;
};	

sA.Map.prototype.mapPanZoom = function(newCenter,newZoom,offsetScale) {	
	var map = this.map;
	var view = map.getView();
	
	var duration = 1000;
	var start = +new Date();

	var pan = ol.animation.pan({
		duration: duration,
		source: (view.getCenter())
	});		  		
	
	var curZoom = map.getView().getZoom();	
	if (curZoom == newZoom)
	{
		var bounce = ol.animation.bounce({
			duration: duration,
			resolution: 1.5 * view.getResolution(),
			start: start
		});
	
		map.beforeRender(pan, bounce);
	}
	else
	{
		var zoom = ol.animation.zoom({
			duration: duration,
			resolution: view.getResolution(),
			start: start
		});
		
		map.beforeRender(pan, zoom);
		view.setZoom(newZoom);
	}
		
	var size = (map.getSize());
	var offsetScale = (this.isObj(offsetScale)?offsetScale:[0,0]);
			
	view.centerOn(
		newCenter,
		size,			
		[(size[0]/2)+offsetScale[0],(size[1]/2)+offsetScale[1]]
	);	 	
	
};	

sA.Map.prototype.mapOnMouseMove = function(evt) {	
		
	var lonlat = ol.proj.transform(evt.coordinate,
				"EPSG:3857", "EPSG:4326");
	
	var sai = evt.map.sai;	
	
	if (sai.isObj(sai.featureHighlight))
	{			
		if (sai.featureHighlight[1] != null)
		{						
			sai.unHighlightFeature(sai.featureHighlight);			
		}
	}	
	
	var data = sai.getUtfGridData(evt);			
	
	var textf = "";						
	var textd = "";
	for (var d=0;d<data.length;d++)
	{
		var ugdata = data[d];		
		if (ugdata[0] != null)
		{											
			var text = "";
			var conf = (sai.isObj(ugdata[0].conf)?ugdata[0].conf:false);
			if (conf)
			{
				if (sai.isObj(conf.fields))
				{
					for (var f=0;f<conf.fields.length;f++)
					{
						var field = conf.fields[f];
						if (sai.isObj(ugdata[1][field.name]))
						{
							text += (text == ""?"":", ") + "<strong>" + field.alias + "</strong> " + ugdata[1][field.name];	
						}																					
					}						
				}				
			}						
			
			if (ugdata.length > 2)
			{			
				sai.highlightFeature(ugdata[2],ugdata[0]);				
				
				if (textf.indexOf(text) < 0 && textd.indexOf(text) < 0)
				{
					textf += (textf == ""?"":"<br>") + text;
				}
			}
			else
			{
				if (textf.indexOf(text) < 0 && textd.indexOf(text) < 0)
				{
					textd += (textd == ""?"":"<br>") + text;
				}	
			}
		}
		else
		{
			//console.log(ugdata);	
		}		
	}					
	
	var hdms = ol.coordinate.toStringHDMS(ol.proj.transform(
			evt.coordinate, "EPSG:3857", "EPSG:4326"));
		
	
	var text = textf + (textf == ""?"":"<br>") + textd; 	
	text = text.replace(/null/g,"");
		
	var info = $("#" + sai.id + " .iyo-info");
	var inset = $("#" + sai.id + " .iyo-inset");
		
	info.html(text);	
	
	if (text != "")
	{					
		info.css("display","block");
		inset.css("display","none");
				
		if (evt.originalEvent.shiftKey && sai.isObj(sai.draw)) {
			if (sai.draw[1].getActive())
			{
				$("#" + sai.id +" .ol-viewport").css('cursor','crosshair');				
			}
			else
			{
				$("#" + sai.id +" .ol-viewport").css('cursor','pointer');			
			}	
		}
		else
		{
			$("#" + sai.id +" .ol-viewport").css('cursor','pointer');			
		}				
	}
	else
	{
		info.css("display","none");
		inset.css("display","block");
		
		if (sai.isObj(sai.draw))
		{
			if (sai.draw[1].getActive())
			{
				$("#" + sai.id +" .ol-viewport").css('cursor','crosshair');				
			}
			else
			{
				$("#" + sai.id +" .ol-viewport").css('cursor','pointer');			
			}
		}
		else
		{
			$("#" + sai.id +" .ol-viewport").css('cursor','auto');			
		}	
	}
	
	var coordbox = $("#" + sai.id + " .iyo-coordinate");	
	coordbox.html(hdms);	
};

sA.Map.prototype.mapOnMouseClick = function(evt) {
	var lonlat = ol.proj.transform(evt.coordinate,
				"EPSG:3857", "EPSG:4326");
	
	var sai = evt.map.sai;				
		
	if (sai.isObj(sai.featureHighlight))
	{			
		if (sai.featureHighlight[1] != null)
		{						
			sai.unHighlightFeature(sai.featureHighlight);			
		}
	}
	
	var disinfo = true;
	var data = sai.getUtfGridData(evt);			
	
	var textf = "";						
	var textd = "";
	for (var d=0;d<data.length;d++)
	{
		var ugdata = data[d];		
		if (ugdata[0] != null)
		{								
			var text = "";
			var conf = (sai.isObj(ugdata[0].conf)?ugdata[0].conf:false);
			if (conf)
			{																										
				
				if (sai.isObj(sai.draw))
				{
					
					//console.log(sai.isObj(ugdata[1].gid)+' && '+ugdata[0] == sai.draw[0]);
					if (sai.isObj(ugdata[1].gid) && ugdata[0] == sai.draw[0])
					{																													
						sai.onModify = ugdata[1].gid;
												
						try {
							if (!evt.originalEvent.shiftKey && ugdata[0].conf.geomtype != 'Point') {
								sai.draw[3] = false;
								sai.draw[1].finishDrawing();						
								//sai.draw[3] = true;								
							}
						}
						catch (e) {
							
						}						
						
						//xhr
						var exists = sai.layerEditor.getSource().getFeatureById(ugdata[1].gid);
						//console.log(ugdata[1].gid,exists);
						
						if (exists)
						{														
							if (sai.featureHighlight[0] != null)
							{
								var feature = sai.featureHighlight[0];
							}
							else
							{
								var feature = exists;	
							}
														 
							sai.initUiAttributes(feature,ugdata[0]);
							
						}
						else
						{															
							if (sai.inArray(ugdata[0].conf.type,['geojson']) >= 0)
							{
							
							}							
							else
							{														
								sai.wait();
								sai.xhr(sai.reqUrl + "/iyo/record/view/?data=" + conf.dataId +"&id=" + ugdata[1].gid + "&format=json",function(jsonString){
									
									var data = JSON.parse(jsonString);
									
									var gid = data['gid'];														
									
									var geometry = JSON.parse(data[sai.geom_col]);
									delete data['gid'];
									delete data[sai.geom_col];							
									
									var f = {"type":"Feature","id":gid,"properties":data,"geometry":geometry};		
											
									var geojson = new ol.format.GeoJSON();							
									var feature = geojson.readFeature(f,{dataProjection:"EPSG:4326",featureProjection:"EPSG:3857"});																										
									
									if (sai.layerEditor != null)
									{
										sai.layerEditor.getSource().addFeature(feature);										
										if (!evt.originalEvent.shiftKey) {																						
											//sai.select[1].getFeatures().push(feature);
											sai.initUiAttributes(feature,ugdata[0]);
										}
									}																		
							
									sai.unwait();									
								},function(){
									sai.unwait();
								});
							}
						}						
						return;
					}
					
					disinfo = false;
				}				
				else
				{
				
					if (sai.isObj(conf.sublayers) && ugdata[0].getVisible())
					{										
						sai.map.getLayers().forEach(function (lyr) {													
							if (sai.isObj(lyr.get('name')))
							{
								if (lyr.get('isbase') !== true)
								{
									lyr.setVisible(false);
									var layid = "layer_"+lyr.get('name').toLowerCase().replace(/[^a-zA-Z0-9]/g,"_");
									$("#" + layid +" .iyo-layer-legend").addClass("iyo-box-unshow");
									$("#" + layid +" .iyo-layer-legend").addClass("noprint");
									$("#" + layid +" .iyo-layer-classes").addClass("hidden");
									$("#" + layid +" .iyo-layer-tools-visibility").removeClass("iyo-box-show");
								}
								
							}
							if (sai.inArray(lyr.get('name'),conf.sublayers) >= 0) {							
								lyr.setVisible(true);
								var layid = "layer_"+lyr.get('name').toLowerCase().replace(/[^a-zA-Z0-9]/g,"_");
								$("#" + layid +" .iyo-layer-legend").removeClass("iyo-box-unshow");
								$("#" + layid +" .iyo-layer-legend").removeClass("noprint");
								$("#" + layid +" .iyo-layer-classes").removeClass("hidden");
								$("#" + layid +" .iyo-layer-tools-visibility").addClass("iyo-box-show");
								
								if (sai.isObj(lyr.utfGrid))
								{
									var evt = {map:sai.map};
									lyr.utfGrid.fetch(evt);
								}
							} 						
						});	
						
						/*
						ugdata[0].setVisible(false);
						var layid = "layer_"+ugdata[0].get('name').toLowerCase().replace(/[^a-zA-Z0-9]/g,"_");
						$("#" + layid +" .iyo-layer-legend").addClass("iyo-box-unshow");
						$("#" + layid +" .iyo-layer-legend").addClass("noprint");
						$("#" + layid +" .iyo-layer-classes").addClass("hidden");
						$("#" + layid +" .iyo-layer-tools-visibility").removeClass("iyo-box-show");
						*/ 
						
						var zoom = sai.map.getView().getZoom();
						sai.mapPanZoom(evt.coordinate,Math.min(zoom+3,19));
						
						return true;
					}
					
					if (sai.isObj(conf.fields))
					{
						var reformat = function(str,from,to) {
							var mf = from.match(/function/);
							var mx = from.match(/([A-Za-z0-9]+)\((.*)\)/);							
							if (mf == null && mx == null)
							{							
								var m = str.match(eval(from));
								if (m!=null)
								{
									var nstr = to;
									for (var mi=0;mi<m.length;mi++)
									{
										nstr = nstr.replace(eval("/\\$"+mi+"/g"),m[mi]);									
									}		
									str = nstr;	
								}					
							}
							return str;
						};
						
						for (var f=0;f<conf.fields.length;f++)
						{
							var field = conf.fields[f];
							if (sai.isObj(ugdata[1][field.name]))
							{
								if (ugdata[1][field.name] != null)
								{									
									var str = ugdata[1][field.name]+"";
									if (sai.isObj(field.reformat))
									{																				
										str = reformat(str,field.reformat[0],field.reformat[1]);										
									}
									
									if (sai.isObj(field.type))
									{																				
										if (field.type[0] == 'link')
										{
											var url = str;
											if (sai.isObj(field.type[1].reformat))
											{
												url = reformat(str,field.type[1].reformat[0],field.type[1].reformat[1]);
											}
											str = '<a href="'+url+'" target="blank">' + str + '</a>';
											text += (text == ""?"":", ") + "<strong>" + field.alias + "</strong> " + str;
										}										
									}
									else
									{									
										text += (text == ""?"":", ") + "<strong>" + field.alias + "</strong> " + str;	
									}	
								}
							}																					
						}						
					}
					
					if (!ugdata[0].getVisible())
					{
						disinfo = disinfo?false:disinfo;	
					}
				}
			}							
			
			if (ugdata.length > 2)
			{			
				sai.highlightFeature(ugdata[2],ugdata[0]);
				if (textf.indexOf(text) < 0 && textd.indexOf(text) < 0)
				{
					textf += (textf == ""?"":"<br>") + text;
				}
				evt.coordinate = ugdata[2].getGeometry().getCoordinates();
			}
			else
			{
				if (textf.indexOf(text) < 0 && textd.indexOf(text) < 0)
				{
					textd += (textd == ""?"":"<br>") + text;
				}	
			}
		}
		else
		{
			/*
			console.log("1070");												
			if (sai.isObj(sai.onModify))
			{
				delete sai.onModify;	
			}
			*/
			
		}		
	}
		
	if (sai.isObj(sai.draw) && data.length == 0 || sai.isObj(sai.onModify))	
	{										
		/*
		if (sai.isObj(sai.onModify))
		{
			delete sai.onModify;
		}
		*/ 		
						
		return;
	}	

						
	if (disinfo)
	{
		
		var text = textf + (textf == ""?"":"<br>") + textd; 	
		text = text.replace(/null/g,"");
					
		if (text != "")
		{													
			var overlays = evt.map.getOverlays().getArray();										
			overlays[0].setPosition(evt.coordinate);
			
			sai.popup.find(".iyo-popup-content").html(text.replace(/null/g,""));	
			sai.popup.find(".iyo-popup-closer").css("display","block");
			sai.popup.css("display","block");				
			
			var zoom = sai.map.getView().getZoom();		
			sai.mapPanZoom(evt.coordinate,(zoom<10?Math.min(zoom+2,19):zoom),[0,50]);
		}	
		else
		{
			sai.popup.css("display","none");
		}
	
	}
	
	
};	

sA.Map.prototype.initUi = function() {
	
	var map = this.map;		
	
	$("#" + this.id + " .iyo-panel1 .iyo-tab").css("display","none");
	$("#" + this.id + " .iyo-tool-options-message").css("display","block");		
	
	//$("#" + this.id + " .iyo-panel1 .iyo-layers").css("display","block");		
	//$("#" + this.id + " .iyo-panel1 .iyo-nav-layers").addClass("iyo-box-show");			
	
	this.mkUiNav();
	this.mkUiSearch();	
	this.mkUiHome();
	this.mkUiBase();
	this.mkUiPrint();
	this.mkUiEditAttributes();
	this.mkUiNavInset();
	this.mkUiAddPointCoordinates();
};

sA.Map.prototype.mkUiNav = function() {
	
	var map = this.map;
	
	$("#" + this.id + " .iyo-nav div,#" + this.id + " .iyo-nav span").on("click",function() {
		var vis = $(this).hasClass("iyo-box-show");		
		if (vis)
		{
			$("#" + map.sai.id + " .iyo-panel1 .iyo-tab").css("display","none");		
			$(this).removeClass("iyo-box-show");
			$("#" + map.sai.id +" .iyo-panel1").css("display","none");	
		}
		else
		{
			$("#" + map.sai.id + " .iyo-panel1 .iyo-tab").css("display","none");		
			$("#" + map.sai.id + " .iyo-nav div,#" + map.sai.id + " .iyo-panel0 .iyo-nav span").removeClass("iyo-box-show");
			var klas = $(this).attr("class");		
			$("#" + map.sai.id + " .iyo-panel1 ." + klas.replace("-nav","")).css("display","block");
			$(this).addClass("iyo-box-show");
			$("#" + map.sai.id +" .iyo-panel1").css("display","block");	
		}
	});

	
	$("#" + this.id + " .iyo-nav div,#" + this.id + " .iyo-nav span").on("mouseover",function() {			
		var act = $("#" + map.sai.id + " .iyo-nav").find(".iyo-box-show");
		if (act.length > 0)
		{
			act.removeClass("iyo-box-show");			
		}				
		
		$("#" + map.sai.id + " .iyo-panel1 .iyo-tab").css("display","none");		
		var klas = $(this).attr("class");		
		$("#" + map.sai.id + " .iyo-panel1 ." + klas.replace("-nav","")).css("display","block");		
		if (act.length > 0)
		{			
			$(this).addClass("iyo-box-show");		
		}
		$("#" + map.sai.id + " .iyo-panel1").css("display","block");
	});	
	
	$("#" + this.id + "  .iyo-panel1").on("mouseleave",function() {
		var vis = ($("#" + map.sai.id + " .iyo-panel0 .iyo-box-show").length > 0);	
		if (!vis)
		{
			$(this).css("display","none");		
		}	
	});
};	

sA.Map.prototype.mkUiHome = function() {
	var map = this.map;
	
	$("#" + this.id + " .iyo-home").click(function(){
		
		map.sai.popup.css("display","none");
		var closer = map.sai.popup.find(".iyo-popup-closer");
		closer.blur();		
		
		map.getLayers().forEach(function (lyr) {						
			if (map.sai.isObj(lyr.conf) && !lyr.get('isbase'))
			{				
				var visible = (map.sai.isObj(lyr.conf.visible)?lyr.conf.visible:true);
				lyr.setVisible(visible);			
				
				var layid = "layer_"+lyr.conf.name.toLowerCase().replace(/[^a-zA-Z0-9]/g,"_");
				if (visible)
				{
					$("#" + layid +" .iyo-layer-legend").removeClass("iyo-box-unshow");
					$("#" + layid +" .iyo-layer-legend").removeClass("noprint");
					$("#" + layid +" .iyo-layer-classes").removeClass("hidden");	
					$("#" + layid +" .iyo-layer-tools-visibility").addClass("iyo-box-show");
				}
				else
				{
					$("#" + layid +" .iyo-layer-legend").addClass("iyo-box-unshow");
					$("#" + layid +" .iyo-layer-legend").addClass("noprint");
					$("#" + layid +" .iyo-layer-classes").addClass("hidden");	
					$("#" + layid +" .iyo-layer-tools-visibility").removeClass("iyo-box-show");
				}										
			}			
		});							
		
		var center = ol.proj.transform(map.sai.init.center,
			  "EPSG:4326","EPSG:3857");		
		map.sai.mapPanZoom(center,map.sai.init.zoom);				

	});		
	
	$("#" + this.id + " .iyo-home").bind("mouseover",function(){
		if ($("#" + map.sai.id + " .iyo-tools-button .iyo-box-show").length == 0)
		{		
			$("#" + map.sai.id + " .iyo-tool-options").css("display","none");
			$("#" + map.sai.id + " .iyo-home-message").css("display","block");
		}
	});
		
	$("#" + this.id + " .iyo-home").bind("mouseleave",function(){		
		if ($("#" + map.sai.id + " .iyo-tools-button .iyo-box-show").length == 0)
		{
			$("#" + map.sai.id + " .iyo-home-message").css("display","none");
			$("#" + map.sai.id + " .iyo-tool-options-message").css("display","block");		
		}	
	});
	
	
};	

sA.Map.prototype.mkUiBase = function() {
	var map = this.map;
	
	$("#" + this.id + " .iyo-base").bind("click",function(){
		var vis = ($("#" + map.sai.id + " .iyo-base").hasClass("iyo-box-show"));
		
		$("#" + map.sai.id + " .iyo-tool-options").css("display","none");
		$("#" + map.sai.id + " .iyo-basemaps").css("display",vis?"none":"block");
		if (vis)
		{
			$("#" + map.sai.id + " .iyo-base").removeClass("iyo-box-show");
			$("#" + map.sai.id + " .iyo-tool-options-message").css("display","block");	
		}
		else
		{
			$("#" + map.sai.id + " .iyo-tools-button .iyo-tool").removeClass("iyo-box-show");
			$("#" + map.sai.id + " .iyo-base").addClass("iyo-box-show");
			$("#" + map.sai.id + " .iyo-tool-options-message").css("display","none");	
		}
	});	
	
	$("#" + this.id + " .iyo-base").bind("mouseover",function(){
		if ($("#" + map.sai.id + " .iyo-tools-button .iyo-box-show").length == 0)
		{
			$("#" + map.sai.id + " .iyo-tool-options").css("display","none");
			$("#" + map.sai.id + " .iyo-basemaps").css("display","block");
		}	
	});
	
	$("#" + this.id + " .iyo-base").bind("mouseleave",function(){
		if ($("#" + map.sai.id + " .iyo-tools-button .iyo-box-show").length == 0 && ($("#" + map.sai.id + " .iyo-basemaps").css("display") == "none"))
		{
			$("#" + map.sai.id + " .iyo-tool-options-message").css("display","block");	
			$("#" + map.sai.id + " .iyo-basemaps").css("display","none");
		}	
	});
		
	$("#" + this.id + " .iyo-basemaps").bind("mouseleave",function(){
		var vis = $("#" + map.sai.id + " .iyo-base").hasClass("iyo-box-show");		
		if (!vis)
		{
			$("#" + map.sai.id + " .iyo-tool-options-message").css("display","block");	
			$("#" + map.sai.id + " .iyo-basemaps").css("display","none");
		}	
	});
	
};	

sA.Map.prototype.mkUiPrint = function() {
	var map = this.map;
	$("#" + this.id + " .iyo-print").click(function(){
		$("#" + map.sai.id + " .iyo-panel0 .iyo-nav-layers").click();		
		window.print();
		
	});
	
	/*
	//$("#" + this.id ).bind("onbeforeprint",function() {
	window.matchMedia("print").addListener(function() {
		console.log("print");
		map.updateSize();				
		setTimeout(function(){
			map.updateSize();
		},500);					
	});
	*/ 
	
	$("#" + this.id + " .iyo-print").bind("mouseover",function(){
		if ($("#" + map.sai.id + " .iyo-tools-button .iyo-box-show").length == 0)
		{
			$("#" + map.sai.id + " .iyo-tool-options").css("display","none");
			$("#" + map.sai.id + " .iyo-print-message").css("display","block");
		}	
	});
		
	$("#" + this.id + " .iyo-print").bind("mouseleave",function(){		
		if ($("#" + map.sai.id + " .iyo-tools-button .iyo-box-show").length == 0)
		{
			$("#" + map.sai.id + " .iyo-print-message").css("display","none");			
			$("#" + map.sai.id + " .iyo-tool-options-message").css("display","block");		
		}	
	});
};	

sA.Map.prototype.mkUiNavInset = function() {
	var sai = this;
	$("#" + this.id + " .iyo-nav-inset").on('click mouseover',function(){
		var info = $("#" + sai.id + " .iyo-info");
		var inset = $("#" + sai.id + " .iyo-inset");
		info.css("display","none");
		inset.css("display","block");
		
	});	
};

sA.Map.prototype.mapOnMoveEnd = function(evt) {	
	var sai = this.sai;
	for (var g = 0;g<sai.utfGrids.length;g++)
	{
		var ug = sai.utfGrids[g];
	}
	this.utfGrids = [];
}	

sA.Map.prototype.wait = function() {
	if (typeof this.id != "undefined")
	{
		var sai = this;	
	}
	else if (typeof this.map != "undefined")
	{
		var sai = this.map.sai;
	}		
	$("#" + sai.id +" .iyo-wait").css('display','block');
	$("#" + sai.id +" .ol-viewport").css('cursor','wait');	
	//console.log('wait',sai.id);
};

sA.Map.prototype.unwait = function() {	
	if (typeof this.id != "undefined")
	{
		var sai = this;	
	}
	else if (typeof this.map != "undefined")
	{
		var sai = this.map.sai;
	}
	$("#" + sai.id +" .iyo-wait").css('display','none');
	$("#" + sai.id +" .ol-viewport").css('cursor','auto');		
};

sA.Map.prototype.mkUiSearch = function() {
	var map = this.map;
	$("#" + this.id + " .iyo-search-query input").change(function(){
		alert('cari "' + $(this).val() + '", pencarian belum bisa digunakan ');
	});	
};	

sA.Map.prototype.mkUiEditAttributes = function() {
	var map = this.map;
	
	$("#" + this.id + " .iyo-edit-attributes").bind("click",function(){
		var vis = ($("#" + map.sai.id + " .iyo-edit-attributes").hasClass("iyo-box-show"));
		
		$("#" + map.sai.id + " .iyo-tool-options").css("display","none");
		$("#" + map.sai.id + " .iyo-attributes").css("display",vis?"none":"block");
		
		if (vis)
		{
			$("#" + map.sai.id + " .iyo-edit-attributes").removeClass("iyo-box-show");
			$("#" + map.sai.id + " .iyo-tool-options-message").css("display","block");	
		}
		else
		{
			$("#" + map.sai.id + " .iyo-tools-button .iyo-tool").removeClass("iyo-box-show");
			$("#" + map.sai.id + " .iyo-edit-attributes").addClass("iyo-box-show");
			$("#" + map.sai.id + " .iyo-tool-options-message").css("display","none");	
		}
	});	
	
	$("#" + this.id + " .iyo-edit-attributes").bind("mouseover",function(){
		if ($("#" + map.sai.id + " .iyo-tools-button .iyo-box-show").length == 0)
		{
			$("#" + map.sai.id + " .iyo-tool-options").css("display","none");
			$("#" + map.sai.id + " .iyo-attributes").css("display","block");
		}	
	});
	
	$("#" + this.id + " .iyo-edit-attributes").bind("mouseleave",function(){
		if ($("#" + map.sai.id + " .iyo-tools-button .iyo-box-show").length == 0 && ($("#" + map.sai.id + " .iyo-attributes").css("display") == "none"))
		{			
			$("#" + map.sai.id + " .iyo-attributes").css("display","none");
			$("#" + map.sai.id + " .iyo-tool-options-message").css("display","block");	
		}	
	});
		
	$("#" + this.id + " .iyo-attributes").bind("mouseleave",function(){
		var vis = $("#" + map.sai.id + " .iyo-edit-attributes").hasClass("iyo-box-show");		
		if (!vis)
		{
			$("#" + map.sai.id + " .iyo-attributes").css("display","none");
			$("#" + map.sai.id + " .iyo-tool-options-message").css("display","block");	
		}		
	});
	
};

sA.Map.prototype.formatLength = function(lines,isGeodesic) {
	var length = 0;
	var wgs84Sphere = new ol.Sphere(6378137);
	
	if (this.isObj(lines.getLength))
	{
		lines = [lines];	
	}
	else
	{
		lines = lines.getLineStrings();
	}	
	
	for (var l=0;l <lines.length;l++)
	{	
		var line = lines[l];
		if (isGeodesic) {
			var coordinates = line.getCoordinates();
			length0 = 0;
			var sourceProj = map.getView().getProjection();
			for (var i = 0, ii = coordinates.length - 1; i < ii; ++i) {
				var c1 = ol.proj.transform(coordinates[i], sourceProj, 'EPSG:4326');
				var c2 = ol.proj.transform(coordinates[i + 1], sourceProj, 'EPSG:4326');
				length += wgs84Sphere.haversineDistance(c1, c2);
			}
		} else {		
			length0 = Math.round(line.getLength() * 100) / 100;
		}
		length += length0;
	}
	var output;
	if (length > 100) {
		output = (Math.round(length / 1000 * 100) / 100) +
		' ' + 'km';
	} else {
		output = (Math.round(length * 100) / 100) +
		' ' + 'm';
	}
	return output;
};

sA.Map.prototype.formatArea = function(polygon,isGeodesic) {
	var area;
	var wgs84Sphere = new ol.Sphere(6378137);
	if (isGeodesic) {
		var sourceProj = map.getView().getProjection();
		var geom = /** @type {ol.geom.Polygon} */(polygon.clone().transform(
		sourceProj, 'EPSG:4326'));
		var coordinates = geom.getLinearRing(0).getCoordinates();
		area = Math.abs(wgs84Sphere.geodesicArea(coordinates));
	} else {
		area = polygon.getArea();
	}
	var output;
	if (area > 10000) {
		output = (Math.round(area / 1000000 * 100) / 100) +
		' ' + 'km<sup>2</sup>';
	} else {
		output = (Math.round(area * 100) / 100) +
		' ' + 'm<sup>2</sup>';
	}
	return output;
};

sA.Map.prototype.mkUiAddPointCoordinates = function() {
	var map = this.map;
	
	$("#" + this.id + " .iyo-add-coordinates").bind("click",function(){
		var vis = ($("#" + map.sai.id + " .iyo-add-coordinates").hasClass("iyo-box-show"));
		
		$("#" + map.sai.id + " .iyo-tool-options").css("display","none");
		$("#" + map.sai.id + " .iyo-add-coordinates-form").css("display",vis?"none":"block");
		if (vis)
		{
			$("#" + map.sai.id + " .iyo-add-coordinates").removeClass("iyo-box-show");
			$("#" + map.sai.id + " .iyo-tool-options-message").css("display","block");	
		}
		else
		{
			$("#" + map.sai.id + " .iyo-tools-button .iyo-tool").removeClass("iyo-box-show");
			$("#" + map.sai.id + " .iyo-add-coordinates").addClass("iyo-box-show");
			$("#" + map.sai.id + " .iyo-tool-options-message").css("display","none");	
		}
	});	
	
	$("#" + this.id + " .iyo-add-coordinates").bind("mouseover",function(){
		if ($("#" + map.sai.id + " .iyo-tools-button .iyo-box-show").length == 0)
		{
			$("#" + map.sai.id + " .iyo-tool-options").css("display","none");
			$("#" + map.sai.id + " .iyo-add-coordinates-form").css("display","block");
		}	
	});
	
	$("#" + this.id + " .iyo-add-coordinates").bind("mouseleave",function(){
		if ($("#" + map.sai.id + " .iyo-tools-button .iyo-box-show").length == 0 && ($("#" + map.sai.id + " .iyo-add-coordinates-form").css("display") == "none"))
		{
			$("#" + map.sai.id + " .iyo-tool-options-message").css("display","block");	
			$("#" + map.sai.id + " .iyo-add-coordinates-form").css("display","none");
		}	
	});
		
	$("#" + this.id + " .iyo-add-coordinates-form").bind("mouseleave",function(){
		var vis = $("#" + map.sai.id + " .iyo-add-coordinates").hasClass("iyo-box-show");		
		if (!vis)
		{
			$("#" + map.sai.id + " .iyo-tool-options-message").css("display","block");	
			$("#" + map.sai.id + " .iyo-add-coordinates-form").css("display","none");
		}	
	});
	
	$("#" + this.id + "-iyo-coordinates-clear").click(function(){
		$("#" + map.sai.id + "-iyo-coordinates-form").val("");
		map.sai.featureOverlay.getFeatures().clear();
	});
	
	$("#" + this.id + "-iyo-coordinates-add").click(function(){		
		var coords = $("#" + map.sai.id + "-iyo-coordinates-form").val().split("\n");
		for (var c=0;c<coords.length;c++)
		{			
			coord = coords[c].split(",");
			var pointsc = [parseFloat(coord[0]),parseFloat(coord[1])];
			var coord = ol.proj.transform(
				pointsc, "EPSG:4326","EPSG:3857");			
							
			var feature = new ol.Feature({
			  geometry: new ol.geom.Point(coord),
			  isModified:true,			  
			});
			
			if (map.sai.layerEditor != null)
			{
				map.sai.layerEditor.getSource().addFeature(feature);
			}
			else
			{
				map.sai.featureOverlay.addFeature(feature);
			}
			
		}		
	});
	
};