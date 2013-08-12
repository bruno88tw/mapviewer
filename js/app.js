/**
 *  @file js/app.js
 *  @author Bruno José Vecchietti <bruno88tw@gmial.com>
 *  @fileOverview Archivo javascript de arranque de la aplicación. Contiene el algoritmo de ejecución principal de la aplicación.
 *  @copyright Copyright (C) 2012  Bruno José Vecchietti.
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *  <p>
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *  <p>
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see {@link http://www.gnu.org/licenses/}. 
 */

/**
 * Namespace de acceso a la aplicación.
 * @namespace
 */
var app = {};

/**
 * Límites para la máxima extensión del mapa. (west, south, east, north).
 * @type OpenLayers.Bounds
 */
app.max_bounds = new OpenLayers.Bounds(-76, -49, -60, -38);

/**
 * Proyección EPSG:4326.
 * @type OpenLayers.Projection
 */
app.projection4326 = new OpenLayers.Projection("EPSG:4326");

/**
 * Proyección EPSG:900913 (Google Mercator).
 * @type OpenLayers.Projection
 */
app.projection900913 = new OpenLayers.Projection("EPSG:900913");

/**
 * Resoluciones para los niveles de zoom de las capas base.
 * @type Array
 */
app.resolutions = OpenLayers.Layer.Bing.prototype.serverResolutions.slice(6, 19);

/**
 * Resoluciones para los niveles de zoom de la capa base MapQuest Aerial.
 * @type Array
 */
app.resolutions2 = OpenLayers.Layer.Bing.prototype.serverResolutions.slice(6, 12);

/**
 * Control de reconocimiento WFS.
 * @type OpenLayers.Control.GetFeature
 */
app.wfsReconocerControl = null;

/**
 * Control de selección WFS.
 * @type OpenLayers.Control.SelectFeature
 */
app.wfsSelectControl = null;

/**
 * Nodo raíz del árbol de capas.
 * @type Ext.tree.TreeNode
 */
app.rootnode = new Ext.tree.TreeNode({
   text: "Capas",
   icon: "img/layers.png",
   leaf:false,
   expanded: true          
}); 

/**
 * Store para exportar a excel el contenido del gridPanel de atributos.
 * @type GeoExt.data.FeatureStore
 */
app.wfsStoreExport = new GeoExt.data.FeatureStore({
    fields: [],
    layer: Ext.getCmp("wfsLayer")
});

/**
 * Store de servidores WMS.
 * @type Ext.data.ArrayStore
 */
app.wmsServerStore = new Ext.data.ArrayStore({
    fields: ['nombre', 'url'],
    data: [
        ["Dirección General de Estadística y Censos","http://idedgeyc.chubut.gov.ar/geoserver/wms"],
        ["Instituto Geográfico Nacional 1","http://sdi.ign.gob.ar/geoserver2/wms"],
        ["Instituto Geográfico Nacional 2","http://wms.ign.gob.ar/geoserver/ows"],    
        ["Secretaría de Ciencia Tecnología e Innovación","http://200.63.163.47/geoserver/wms"],
        ["Ministerio de Educación","http://www.chubut.edu.ar:8080/geoserver/wms"],
        ["Secretaría de Energía","http://sig.se.gob.ar/cgi-bin/mapserv6?MAP=/var/www/html/visor/geofiles/map/mapase.map"]
    ],
    idIndex: 0 // id for eache record will be the first element (in this case, 'nombre')
});

/**
 * Ubicación del proxy cgi.
 * @type String
 */
OpenLayers.ProxyHost = "/cgi-bin/proxy.cgi?url=";

/**
 * Función de inicio de aplicación. 
 * Declara el algoritmo de ejecución principal de la aplicación.
 */
Ext.onReady(function() {
    
    Ext.QuickTips.init();         
    app.crearMapa();
    app.agregarControles();
    app.agregarCapasBase();
    app.generarViewport();   
    app.configuracionFinal();
    
});

/**
 * Crea el mapa de la aplicación. 
 * Inicializa app.map con una instancia de OpenLayers.Map.
 * @returns {undefined} Esta función no devuelve resultados.
 */
app.crearMapa = function(){               
   
    app.map = new OpenLayers.Map(
        "divMapa",
        {
            controls: [],
            resolutions: app.resolutions,
            restrictedExtent: app.max_bounds.clone().transform(app.projection4326, app.projection900913),  
            projection: app.projection900913,
            displayProjection: app.projection4326, 
            units: 'm'
        }
    );   
        
};

/**
 * Agrega controles básicos al mapa.
 * @returns {undefined} Esta función no devuelve resultados.
 */
app.agregarControles = function(){
    
    app.map.addControl(new OpenLayers.Control.NavigationHistory());
    app.map.addControl(new OpenLayers.Control.Navigation());
    app.map.addControl(new OpenLayers.Control.WMSGetFeatureInfo({
        queryVisible: true,
        drillDown: true,
        infoFormat: "application/vnd.ogc.gml",
        maxFeatures: 20,
        eventListeners: {"getfeatureinfo": function(e){handler.onGetFeatureInfo(e)}}
    }));
    app.map.addControl(new OpenLayers.Control.PanZoomBar(),new OpenLayers.Pixel(134,2));        
    
};

/**
 * Agrega capas base y capas vectoriales al mapa.
 * @returns {undefined} Esta función no devuelve resultados.
 */
app.agregarCapasBase = function(){
    
    // Capas Base
    app.map.addLayer(new OpenLayers.Layer.WMS(
        "IGN", 
        "http://idedgeyc.chubut.gov.ar/geoserver/wms", 
        {layers: "rural:basemap", transparent: 'false', format: 'image/jpeg', tiled: 'true'}, 
        {isBaseLayer: true, visibility: false, singleTile: false, displayInLayerSwitcher: false}
    ));   
    app.map.addLayer(new OpenLayers.Layer.Google("Google Streets",{minZoomLevel: 6, maxZoomLevel: 19}));
    app.map.addLayer(new OpenLayers.Layer.Google("Google Terrain",{type: google.maps.MapTypeId.TERRAIN, minZoomLevel: 6, maxZoomLevel: 15}));
    app.map.addLayer(new OpenLayers.Layer.Google("Google Satellite",{type: google.maps.MapTypeId.SATELLITE, minZoomLevel: 6, maxZoomLevel: 19}));
    app.map.addLayer(new OpenLayers.Layer.Google("Google Hybrid",{type: google.maps.MapTypeId.HYBRID, minZoomLevel: 6, maxZoomLevel: 19}));
    app.map.addLayer(new OpenLayers.Layer.OSM("OpenStreetMap",null,{zoomOffset: 6, resolutions: app.resolutions, isBaseLayer:true, sphericalMercator: true}));    
    app.map.addLayer(new OpenLayers.Layer.Bing({name: "Bing Road", key: 'An-hnXUInDJCCN2NgVvNDgZh5h7Otc4CxXZi9TEgJcqjuAu3W9MSzXoAqkxhB1C5', type: "Road", zoomOffset: 6, resolutions: app.resolutions}));
    app.map.addLayer(new OpenLayers.Layer.Bing({name: "Bing Aerial", key: 'An-hnXUInDJCCN2NgVvNDgZh5h7Otc4CxXZi9TEgJcqjuAu3W9MSzXoAqkxhB1C5', type: "Aerial", zoomOffset: 6, resolutions: app.resolutions}));
    app.map.addLayer(new OpenLayers.Layer.Bing({name: "Bing Hybrid", key: 'An-hnXUInDJCCN2NgVvNDgZh5h7Otc4CxXZi9TEgJcqjuAu3W9MSzXoAqkxhB1C5', type: "AerialWithLabels", zoomOffset: 6, resolutions: app.resolutions}));
    app.map.addLayer(new OpenLayers.Layer.OSM("MapQuest",["http://otile1.mqcdn.com/tiles/1.0.0/map/${z}/${x}/${y}.jpg","http://otile2.mqcdn.com/tiles/1.0.0/map/${z}/${x}/${y}.jpg","http://otile3.mqcdn.com/tiles/1.0.0/map/${z}/${x}/${y}.jpg","http://otile4.mqcdn.com/tiles/1.0.0/map/${z}/${x}/${y}.jpg"],{zoomOffset: 6, resolutions: app.resolutions, isBaseLayer:true, sphericalMercator: true}));  
    app.map.addLayer(new OpenLayers.Layer.OSM("MapQuest Aerial",["http://otile1.mqcdn.com/tiles/1.0.0/sat/${z}/${x}/${y}.jpg","http://otile2.mqcdn.com/tiles/1.0.0/sat/${z}/${x}/${y}.jpg","http://otile3.mqcdn.com/tiles/1.0.0/sat/${z}/${x}/${y}.jpg","http://otile4.mqcdn.com/tiles/1.0.0/sat/${z}/${x}/${y}.jpg"],{zoomOffset: 6, resolutions: app.resolutions2, isBaseLayer:true, sphericalMercator: true}));            

    // Vector layer para el localizador
    app.map.addLayer(new OpenLayers.Layer.Vector("Location", {
        styleMap: new OpenLayers.Style({
            externalGraphic: "http://openlayers.org/api/img/marker.png",
            graphicYOffset: -25,
            graphicHeight: 25,
            graphicTitle: "${name}"
        }),
        displayInLayerSwitcher: false
    }));   

    // Vector layer para las consultas WFS            
    app.map.addLayer(new OpenLayers.Layer.Vector("wfsLayer", {
        displayInLayerSwitcher: false
    }));
    
 
    
};

/**
 * Genera el vieport y le incorpora todos los paneles necesarios.
 * @returns {undefined} Esta función no devuelve resultados.
 */
app.generarViewport = function(){            
    
    new Ext.Viewport({
            layout: "border",  
            border:false,
            items:[
                panel.banner(),
                panel.layerTreePanel(),                     
                panel.mapPanel(),
                panel.featureGridPanel()                         
            ]
    });  
    
};

/**
 * Configuración final de la aplicación. 
 * Agrega elementos al mapPanel y realiza modificaciones sobre el css de algunos componentes.
 * @returns {undefined} Esta función no devuelve resultados.
 */
app.configuracionFinal = function(){


    // Importa las capas definidas en app.tree y el orden definido en app.index
    if(config.tree != null){
        restoreTree(app.rootnode,config.tree);
        restoreIndex(config.index);          
    }  

    //Agrega al mapPanel los div sobre los cuales se renderizarán los siguientes componentes
    document.getElementById('mapPanel').getElementsByClassName('x-panel-body')[0].firstChild.appendChild(document.getElementById('scalelinediv'));
    document.getElementById('mapPanel').getElementsByClassName('x-panel-body')[0].firstChild.appendChild(document.getElementById('minimapcontainer'));
    document.getElementById('mapPanel').getElementsByClassName('x-panel-body')[0].firstChild.appendChild(document.getElementById('rosa'));
    document.getElementById('mapPanel').getElementsByClassName('x-panel-body')[0].firstChild.appendChild(document.getElementById('titulodiv'));
    document.getElementById('mapPanel').getElementsByClassName('x-panel-body')[0].firstChild.appendChild(document.getElementById('subtitulodiv'));
    document.getElementById('mapPanel').getElementsByClassName('x-panel-body')[0].firstChild.appendChild(document.getElementById('legenddiv'));                              

    // Agrego el control de posición del mouse 
    app.map.addControl(new OpenLayers.Control.MousePosition({
        div: document.getElementById('position'),
        formatOutput: function(lonLat) {
            var markup = convertDMS(lonLat.lat, "LAT");
            markup += " " + convertDMS(lonLat.lon, "LON");
            return markup;
        }
    }));     
    
    // Agrega el control de escala
    app.map.addControl(new OpenLayers.Control.ScaleLine({
        div: document.getElementById("scalelinediv")
    }));
    
    // Agrega el control de minimapa
    app.map.addControl(new OpenLayers.Control.OverviewMap({
        layers:[new OpenLayers.Layer.OSM("OSM",null,null,{isBaseLayer: true, maxZoomLevel: 20})],
        size: new OpenLayers.Size(150, 130),
        div: document.getElementById('minimap')            
    }));       

    // Agrega el panel de leyenda que se visualiza dentro del mapa
    new GeoExt.LegendPanel({
        title: 'Leyenda',
        iconCls: "legendIcon",
        id: "legendPanelOnMap",
        autoScroll: true,
        width: 250,
        height: Ext.getCmp("mapPanel").getHeight() - 73,
        collapsible: false,
        collapsed: false,
        border: false,
        renderTo: document.getElementById("legenddiv"),
        bodyCfg : { cls:'x-panel-body your-own-rule' , style: {'background':'rgba(255, 255, 255, 0.6)'} },
        defaults: {
            style: 'padding:5px',
            baseParams: {
                FORMAT: 'image/png',
                LEGEND_OPTIONS: 'forceLabels:on'
            }
        }
    });  


    // Agrego un manejador sobre el evento de resize del mapPanel para acomodar el tamaño del legendPanelOnMap
    Ext.getCmp("mapPanel").on("bodyresize", function(){
        Ext.getCmp("legendPanelOnMap").setHeight(Ext.getCmp("mapPanel").getHeight() - 73);
    });    

    // Modifico las propiedades css de algunos componentes para perfeccionar la estética de la aplicación
//    document.getElementById("layerTreePanel").getElementsByClassName('x-panel-bwrap')[0].getElementsByClassName('x-panel-tbar')[0].firstChild.style.backgroundColor = "#BACAE6";
//    document.getElementById("layerTreePanel").getElementsByClassName('x-panel-bwrap')[0].getElementsByClassName('x-panel-tbar')[0].firstChild.style.borderBottomColor = "#BACAE6";
//    document.getElementById("layerTreePanel").getElementsByClassName('x-panel-bwrap')[0].getElementsByClassName('x-panel-bbar')[0].firstChild.style.backgroundColor = "#BACAE6";
//    document.getElementById("layerTreePanel").getElementsByClassName('x-panel-bwrap')[0].getElementsByClassName('x-panel-bbar')[0].firstChild.style.borderTopColor = "#BACAE6";
//    document.getElementById("layerTreePanel").getElementsByClassName('x-panel-bwrap')[0].getElementsByClassName('x-panel-bbar')[0].firstChild.style.height = "20px";
//    document.getElementById("layerTreePanel").getElementsByClassName('x-panel-header')[0].style.height = "17px";
//    document.getElementById("legendPanel").getElementsByClassName('x-panel-header')[0].style.height = "21px";
//    document.getElementById("featureGridPanel").getElementsByClassName('x-panel-bwrap')[0].getElementsByClassName('x-panel-tbar')[0].firstChild.style.backgroundColor = "#BACAE6";
//    document.getElementById("featureGridPanel").getElementsByClassName('x-panel-bwrap')[0].getElementsByClassName('x-panel-tbar')[0].firstChild.style.borderBottomColor = "#BACAE6";
       
};
