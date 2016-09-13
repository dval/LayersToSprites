/*
* This script exports layers to images/sprites with a folder hierachy that matches the LayerSets in the document.
* The primary goal is to create folders for each layer set and publish specified image type into created folders.
* This was created to help with the  Photoshop >  SpriterPro > TexturePacker > Unity3D in 2D workflow.
* 
* Using this script should allow you to publish your PS characters/puppets directly into your Spriter project folder.
* (you can skip the layout step and just use the individual sprites in Spriter.)
* Then, let TexturePacker handler the spritesheet creation when importing into Unity.
*
*/

#target photoshop

//Only run if a file is open
if ( app.documents.length > 0 && app.activeDocument.name.substr(0,8) != 'Untitled' ) {
    
    // get active document
	var currentDoc = {};
        currentDoc.ref = app.activeDocument;
        currentDoc.name = app.activeDocument.name.match(/(.*)\.[^\.]+$/)[1];
        currentDoc.path = app.activeDocument.path;
        currentDoc.groups = collectLayerSets(app.activeDocument);
        
    // filter for checking if entry is numeric, thanks to xbytor //
	numberKeystrokeFilter = function() {
        this.text = this.text.replace(",", "");
        this.text = this.text.replace(".", "");
        if (this.text.match(/[^\-\.\d]/)) {
            this.text = this.text.replace(/[^\-\.\d]/g, "");
        };
        if (this.text == "") {
            this.text = "0"
        }
	};

    // create  dialog;	
	var dlg = new Window('dialog', "Export Sprites", [500,300,930,840]);
	
    // create list for layer-selection;
	dlg.layerRange = dlg.add('panel', [21,20,279,445], "Select LayserSets to export:");
	dlg.layerRange.layersList = dlg.layerRange.add('listbox', [11,20,240,405], '', {multiselect: true});
    // add all layers selected by default
	for (var q = 0; q < currentDoc.groups.length; q++) {
		dlg.layerRange.layersList.add ("item", currentDoc.groups[q].name);
		dlg.layerRange.layersList.items[q].selected = true
	};
        
    // entry for prefix;
	dlg.prefix = dlg.add('panel', [290,20,410,85], "Prefix for all Sprites:");
	dlg.prefix.prefixText = dlg.prefix.add('edittext', [11,20,99,40], "", {multiline:false});
    
    // field to select target-folder;
	dlg.target = dlg.add('panel', [290,285,410,445], "Export to:");
	dlg.target.targetSel = dlg.target.add('button', [11,20,100,40], "Select");
	dlg.target.targetField = dlg.target.add('statictext', [11,50,100,155], String(currentDoc.path), {multiline:true});
	dlg.target.targetSel.onClick = function () {
		var target = Folder.selectDialog("Select folder to export to:");
		dlg.target.targetField.text = target.fsName
	};

    // ok- and cancel-buttons;
    dlg.buildBtn = dlg.add('button', [220,460,410,475], 'Export', {name:'ok'});
	dlg.cancelBtn = dlg.add('button', [21,460,210,475], 'Cancel', {name:'cancel'});
	dlg.warning = dlg.add('statictext', [21,490,410,530], "Warning: Existing files will be replaced without prompting!", {multiline: true});
	dlg.center();
    
    // final check before we run script
    var submitJob = dlg.show ();
    
    // Handle any 'is OK to .show() dialog?' issues 
    if (submitJob == true && dlg.layerRange.layersList.selection.length > 0) {

        // get the number instead of the name;	
        var theLayerSelection = new Array;
        var theColl = dlg.layerRange.layersList.items;
        for (var p = 0; p < dlg.layerRange.layersList.items.length; p++) {
            if (dlg.layerRange.layersList.items[p].selected == true) {
                theLayerSelection = theLayerSelection.concat(p);
            }
        };

        // collect the rest of the variables,
        var thePrefix = dlg.prefix.prefixText.text;
        //var theNumber = Number (dlg.number.startNumber.text) - 1;
        //var theLayerNameAdd = dlg.layerName.doAddName.value;
        var theDestination = dlg.target.targetField.text;
        //var theNumbering = dlg.number.addNumber.value;

        // pdf options	
        pdfOpts = new PDFSaveOptions() ;
        pdfOpts.embedColorProfile = true;
        pdfOpts.PDFCompatibility =  PDFCompatibility.PDF13;
        pdfOpts.downSample =  PDFResample.NONE;
        pdfOpts.vectorData = true;
        pdfOpts.alphaChannels = false;
        pdfOpts.byteOrder = ByteOrder.MACOS; 
        pdfOpts.layers = false ;
        pdfOpts.preserveEditing = false ;
        pdfOpts.convertToEightBit = true;
        pdfOpts.annotations = false;
        pdfOpts.colorConversion = false;
        pdfOpts.embedFonts = true;
        pdfOpts.embedThumbnail = true;
        pdfOpts.transparency = false;
        pdfOpts.encoding = PDFEncoding.PDFZIP ;	
        var theVisibilities = new Array;

        var jpgopts = new JPEGSaveOptions();
        jpgopts.byteOrder = ByteOrder.MACOS;
        jpgopts.embedColorProfile = true;
        jpgopts.formatOptions = FormatOptions.STANDARDBASELINE;
        jpgopts.matte = MatteType.NONE;
        jpgopts.quality = 10;
        
        // create the pdf-name;
        var fileNamePrefix = "";
        if (thePrefix.length > 0) {
            fileNamePrefix = thePrefix+"_";
        }
    
        // create a flattened copy;
        var theCopy = myDocument.duplicate("thecopy", true);
        
        // do the operation;
        for (var m = theLayerSelection.length - 1; m >0; m--) {
            
            //app.activeDocument = myDocument;
            
            var theLayer = theLayerSets[theLayerSelection[m]];
            var aLayerName = "_" + theLayer.name.replace("/", "_")
            			
            // transfer layerset over to the copy;
            theLayer.duplicate (theCopy, ElementPlacement.PLACEATBEGINNING);
            app.activeDocument = theCopy;
            // hide the llast added layer;
            theCopy.layers[1].visible = false;
            //theCopy.saveAs((new File(theDestination+"/"+myDocName+aSuffix+aLayerName+theNumberString+".pdf")),pdfOpts,true)
            theCopy.saveAs((new File(theDestination+"/"+aSuffix+aLayerName+theNumberString+".jpg")),jpgopts,true);
            
        }//endfor
    
        theCopy.close(SaveOptions.DONOTSAVECHANGES);

    }//endif

} else  if( app.activeDocument ){
    alert ("The documnet must be saved before running this script.");
} else {
    alert ("There is no document open.");
}


// buffer number with zeros 
function bufferNumberWithZeros (number, places) {
    var theNumberString = String(number);
    for (var o = 0; o < (places - String(number).length); o++) {
        theNumberString = String("0" + theNumberString)
    };

    return theNumberString
};

////// function collect all layersets //////
function collectLayerSets (theParent) {
	if (!allLayerSets) {
		var allLayerSets = new Array} 
	else {};
	for (var m = theParent.layers.length - 1; m > 0;m--) {
		var theLayer = theParent.layers[m];
// apply the function to layersets;
		if (theLayer.typename == "ArtLayer") {
		//	allLayerSets = allLayerSets.concat(theLayer)
			}
		else {
// this line includes the layer groups;
			allLayerSets = allLayerSets.concat(theLayer);
			allLayerSets = allLayerSets.concat(collectLayerSets(theLayer))
			}
		}
	return allLayerSets
};
