$(document).ready(function() {
  document.getElementsByTagName("html")[0].style.visibility = "visible";
});

function wait(fn) {
  window.setTimeout(function() { fn(); }, 1000);
}

var finishedRecords = [];
var noCommon = "";
var count = 0;
var invalidCharsRegex = "";
summary = "";
summaryCSV="";
var uniProtToPDB = new Map;
var PDBToUniProt = new Map;
var cleanTree = false;
var tree = "";
var cleanedTree = "";
ids_with_underscores = ["XP", "XM", "XR", "WP", "NP", "NC", "NG", "NM", "NR"];

var cleanedSeqsResults = "";
var badCharactersResults = "";
var obsoleteSeqsResults = "";
var badIdsResults = "";
// If the tree is trimmed to the first space, keep a note of this so we can update it accordingly
var trimmedTree = false;



if (cleanTree){
  $("#treeCheck").prop("disabled", false);

} else {
  $("#treeCheck").prop("disabled", true);

}

$.support.cors = true;

$("#commonName").attr('checked', false);
$("");

$(document).on({
    ajaxStart: function() { $( ".loader" ).show();    },
});

// Hide the loading screen and clear the loading text
function hideLoadingScreen(){
  $( ".loader" ).hide();
  $(".loader-text").html("Cleaning sequences!");
}

// Check that we have the correct number of cleaned sequences
function checkFinal(count, records){
  if (count == numRecords){
    hideLoadingScreen();

    appendOutput(records);


    // Check if we failed to retrieve information for any sequences
    var warning = "";
    for (var key in infoErrors) {
        // check if the property/key is defined in the object itself, not in parent
        if (infoErrors.hasOwnProperty(key)) {
          if (key == 'geneName'){
            warning += "<br>Couldn't find the gene information for these sequences <br>";

          }

          else if (key == 'commonName'){
            warning += "<br>Couldn't find the common name for these sequences <br>";
          }

          else {
            warning += "<br>Couldn't find the full taxonomic information for " + key + "  for these sequences <br>";


          }


          splitSeqs = infoErrors[key].trim().split(" ");

          for (var seq in splitSeqs) {
            warning += splitSeqs[seq] + "<br>";


          }


        }
    }

    if (warning.length > 1){
      bootstrap_alert.warning(warning);
    }




    // If we are also cleaning a tree
    if (cleanTree) {
      cleanedTree = cleanTreeNames();

    }

    // Create the summary file

    summary += "Original headers : Cleaned headers \r\n";

    // Create the summary CSV file

    summaryCSV += "Original header, Cleaned header \r\n";

    for (var i in records){
      // If we were able to clean up the sequence, record the final header
      if (records[i].finalHeader){
        summary += records[i].originalHeader.substring(1).trim()  + " : " + records[i].finalHeader.substring(1)  + "\r\n";
        summaryCSV += records[i].originalHeader.substring(1).trim()  + "," +  records[i].finalHeader.substring(1) + "\r\n";
      }

      // Otherwise record the original header
      else {
        summary += records[i].originalHeader.substring(1).trim()  + " : " + records[i].originalHeader.substring(1)  + "\r\n";
        summaryCSV += records[i].originalHeader.substring(1).trim() + "," +  records[i].originalHeader.substring(1) + "\r\n";


      }

    }

    if ($("#cleanedSeqs").val()) {
      $("#cleanCheck").prop("disabled", false);
    }

    else {
      $("#cleanCheck").prop("disabled", true);
      $("#cleanCheck").prop("checked", false);

    }

    if ($("#badCharacters").val()) {
      $("#illegalCheck").prop("disabled", false);
    }

    else {
      $("#illegalCheck").prop("disabled", true);
      $("#illegalCheck").prop("checked", false);

    }
    
    if ($("#obsoleteSeqs").val()) {
      $("#obsoleteCheck").prop("disabled", false);
    }

    else {
      $("#obsoleteCheck").prop("disabled", true);
      $("#obsoleteCheck").prop("checked", false);

    }

    if ($("#badIds").val()) {
      $("#unmappableCheck").prop("disabled", false);
    }

    else {
      $("#unmappableCheck").prop("disabled", true);
      $("#unmappableCheck").prop("checked", false);

    }


    $("#csvCheck").prop("disabled", false);

    $("#summaryCheck").prop("disabled", false);




  }
}


function cleanTreeNames() {
  // Make cleaned tree selectable as an output to download
  $("#treeCheck").prop("disabled", false);

  // On the off chance that a tree has duplicate names in it, store the names to make the SeqScrub output consistent
  name_list = [] 

  splitSummary = summary.split("\n");

  cleanedTree = tree;

  // // This step is needed in case a program had already encased a name in the Newick string with quotation marks.
  // cleanedTree = cleanedTree.replace(/'/g, "");

  for (var line in splitSummary){
    splitLine = splitSummary[line];

    if (splitLine.trim().length > 0){

      console.log(splitLine)

      oldname = splitLine.split(" : ")[0].trim();
      newname = splitLine.split(" : ")[1].trim();

    // If this is a trimmed tree (i.e. the original tree cuts off after the first space in the header, change the names to reflect this)
    if (trimmedTree){
      oldname = oldname.split(" ")[0];

    }

    // Escape characters in the old name which will interfere with our regular expression
    oldname = escapeRegExp(oldname);


    // If the old name hasn't already been cleaned up (off-chance check for duplicate names)
    if (!(name_list.indexOf(oldname) >=0)){ 


      treeRegEx = new RegExp(oldname, "g");
      quotationRegEx = new RegExp("\'" + oldname + "\'", "g")

      // If we want to add quotation marks around headers with whitespace and this header doesn't already have quotation marks
      if ((addQuotationMarks) && (/\s/.test(newname)) && !(quotationRegEx.test(cleanedTree))){
        cleanedTree = cleanedTree.replace(treeRegEx, "'" + newname + "'");
      }
      else {
        cleanedTree = cleanedTree.replace(treeRegEx, newname);
      }


      name_list.push(oldname);

    }

  }
}


return cleanedTree;
}


function progressText(count){

  pad = count.toString().padStart(numRecords.toString().length, 0);
  $(".loader-text").html("Cleaned " + pad + "/" + numRecords );
  $("#progressbar").progressbar({ value: 200});
  $(".loader").css("border-top", "border-top: 16px solid red");
}



// Update the filename field
document.getElementById("file").onchange = function () {

  filename = this.value.replace(/.*[\/\\]/, '');
  $("#fileToSave").val(filename);
};

// Update the treename field
document.getElementById('tree').onchange = function () {

  treename = this.value.replace(/.*[\/\\]/, '');
  $("#treeToSave").val(treename);
  cleanTree = true;
};



//Program a custom submit function for the form
$("form#data").submit(function(event) {



  // Clear all the output sections
  summary = "";
  summaryCSV = "";
  count = 0;
  finishedRecords = [];
  $("#cleanedSeqs").empty();
  $("#badCharacters").empty();
  $("#obsoleteSeqs").empty();
  $("#badIds").empty();
  cleanTree = false;
  bootstrap_alert.clear("");


  $("#cleanCheck").prop("disabled", true);
  $("#cleanCheck").prop("checked", false);


  $("#illegalCheck").prop("disabled", true);
  $("#illegalCheck").prop("checked", false);


  $("#obsoleteCheck").prop("disabled", true);
  $("#obsoleteCheck").prop("checked", false);

  $("#unmappableCheck").prop("disabled", true);
  $("#unmappableCheck").prop("checked", false);

  $("#treeCheck").prop("disabled", true);
  $("#treeCheck").prop("checked", false);

  $("#csvCheck").prop("disabled", true);
  $("#csvCheck").prop("checked", false);


  $("#summaryCheck").prop("disabled", true);
  $("#summaryCheck").prop("checked", false);


  $("#selectAll").prop("checked", false);
  $("#selectAllLabel").html('Select all output');





  addUnderscores = $('#addUnderscore').is(":checked");
  addSquareBrackets = $('#addSquareBrackets').is(":checked");
  removeSpeciesBrackets = $('#removeSpeciesBrackets').is(":checked");
  addQuotationMarks = $('#addQuotationMarks').is(":checked");
  commonName = $('#commonName').is(":checked");
  retainFirst = $('#getFirstID').is(":checked");
  stripUniProtID = $('#stripUniProtID').val();
  removeObsolete = $('#checkObsolete').is(":checked");
  removeUncleaned = $('#removeUnclean').is(":checked");
  replaceHeadersDB = $('#replaceHeadersDBCheck').is(":checked");
  replaceChars = $('#replaceCharsCheck').is(":checked");
  aaOpt = ($("#seqType").val() == '1');
  idChar = $("#idChar").val();
  geneChar = $("#geneChar").val();
  taxonChar = $("#taxonChar").val();
  speciesChar = $("#speciesChar").val();
  infoErrors = {};
  invalidChars = $("#invalidChars").val().length > 0;
  invalidHeadChars = $("#invalidHeadChars").val().length > 0;



  headerFormat = $('select#header-format').val();

  //Disable the default form submission
  event.preventDefault();

  //Grab all form data  
  var formData = new FormData($(this)[0]);

  //Generate a new regex containing the invalid character

  if (invalidChars){
    invalidCharsRegex = new RegExp(escapeRegExp($("#invalidChars").val().trim()).replace(/ /g, "|"));
  }

 
  //Generate a new regex containing the header characters to replace
  headerCharsRegex = new RegExp(escapeRegExp($("#replaceChars").val().trim()).replace(/ /g, "|"), 'g');

  invalidHeaderCharsRegex = new RegExp(escapeRegExp($("#invalidHeadChars").val().trim()).replace(/ /g, "|"), 'g');

  replaceHeadersRegex = new RegExp(escapeRegExp($("#replaceHeadersDB").val().trim()).replace(/ /g, "|"), 'g');


  //Change the filename for the file and tree to save to mirror the uploaded filename
  var filename = $('#file').val().split(/(\\|\/)/g).pop();
  var treename = $('#tree').val().split(/(\\|\/)/g).pop();

  if (treename.length > 1){
    cleanTree = true;

}

  var ncbiList = [];
  var uniprotList = [];
  var pdbList = [];
  var giList = [];
  uniprotDict = {};
  ncbiDict = {};


  $.ajax({
    url: 'upload.php',
    type: 'POST',
    data: formData,
    async: true,
    cache: false,
    contentType: false,
    processData: false,
    success: function(returndata) {
      jsonData = JSON.parse(returndata);


      if (cleanTree) {
        tree = jsonData[jsonData.length - 1].tree;
        numRecords = jsonData.length - 1;

      }

      else {
        numRecords = jsonData.length;
      }

      $("#progressbar").progressbar({ max : numRecords});

      // If we are not going to the databases but just performing a replacement of characters in the headers
      if (replaceChars){
        var records = [];
        limit = 1000;
        var badIDsCount, cleanedCount;

        badIDsCount = cleanedCount = 0;

        if (numRecords > limit) {
          bootstrap_alert.warning("Records are too large to write out to fields. Download file for full records");
          limit = 100;
        }
        for (var i = 0; i < numRecords; i++) {


          var record = {
            order: i,
            id: jsonData[i].id.replace(/-/g,"_"),
            taxon: "",
            type: jsonData[i].type,
            species: "",
            seq: jsonData[i].seq,
            obsolete: "",
            ncbiChecked: false,
            appendTo: "",
            originalHeader: jsonData[i].originalHeader
          };



          header = record.originalHeader.replace( headerCharsRegex, "");

          // Can still do a check to remove sequences with illegal characters

          if (invalidChars && invalidCharsRegex.test(record.seq)) {
            record.finalHeader = record.originalHeader;

            if (badIDsCount < limit) {
              output = record.originalHeader  + record.seq.replace(/-/g, "&#8209;") + "&#010;"; //Replace hyphens with non-breaking hyphens
              $("#badCharacters").append(output.trim());
              badIDsCount += 1;
          }

          }


          else {

            record.finalHeader = header;
            output = header  + record.seq.replace(/-/g, "&#8209;") + "&#010;"; //Replace hyphens with non-breaking hyphens
            cleanedSeqsResults += output.trim();


            if (cleanedCount < limit) {

              // output = header  + record.seq.replace(/-/g, "&#8209;") + "&#010;"; //Replace hyphens with non-breaking hyphens
              $("#cleanedSeqs").append(output.trim());
              
              
            
              cleanedCount +=1;
          }

          }

          records.push(record);

        }

        hideLoadingScreen();

        if ($("#cleanedSeqs").val()) {
          $("#cleanCheck").prop("disabled", false);
        }

        else {
          $("#cleanCheck").prop("disabled", true);
          $("#cleanCheck").prop("checked", false);

        }

        if ($("#badCharacters").val()) {
          $("#illegalCheck").prop("disabled", false);
        }

        else {
          $("#illegalCheck").prop("disabled", true);
          $("#illegalCheck").prop("checked", false);

        }



        $("#summaryCheck").prop("disabled", false);

      }

      else {



      // For each sequence in the file
      for (var i = 0; i < numRecords; i++) {

        try{
          var id = jsonData[i].id.toString();
        }

        catch(e) {
          bootstrap_alert.warning("There was a problem reading your file. Is it a FASTA file?");
          hideLoadingScreen();

        }

        var record = {

          order: i,
          id: jsonData[i].id.replace(/-/g,"_"),
          id_name: jsonData[i].id_name,
          taxon: "",
          type: jsonData[i].type,
          species: "",
          seq: jsonData[i].seq,
          obsolete: "",
          commonName: "",
          headerInfo: [],
          ncbiChecked: false,
          appendTo: "",
          originalHeader: jsonData[i].originalHeader
        };

        if (cleanTree) {

          treeRegEx = new RegExp(escapeRegExp(record.originalHeader.substring(1).trim()) + "\:");

          trimmedTreeRegEx = new RegExp(escapeRegExp(record.originalHeader.substring(1).split(" ")[0].trim()) + "\:");


          if ((!treeRegEx.test(tree)) && (!trimmedTreeRegEx.test(tree)) ){
            treeRegEx = new RegExp(escapeRegExp("\'" + record.originalHeader.substring(1).trim()) + "\'\:");

            trimmedTreeRegEx = new RegExp(escapeRegExp("\'" + record.originalHeader.substring(1).split(" ")[0].trim()) + "\'\:");
            hideLoadingScreen();
            if ((!treeRegEx.test(tree)) && (!trimmedTreeRegEx.test(tree)) ){


              bootstrap_alert.warning("The original alignment and tree file don't match. <br>" + record.originalHeader.substring(1).trim() +  " is in the alignment but not in the tree. <br> Check that you have a correctly formatted Newick file that matches your alignment.");
              return false;
          }
        }

          // Check to see if this is a trimmed tree
          if (trimmedTreeRegEx.test(tree) && !(treeRegEx.test(tree))){
            trimmedTree = true;
          }
        }


        if (record.type == 'tr' || record.type == 'sp' || record.type == '' && aaOpt) {

          uniprotList.push(record);

        }

        else if (record.type == 'pdb'){
          pdbList.push(record);
        } 

        else if (record.type == 'gi'){
          giList.push(record)
        }

        else {
          record.ncbiChecked = true;
          ncbiList.push(record);
        }
      }

      if (uniprotList.length > 0) {
        while (uniprotList.length){

            getDataFromUniprot(uniprotList.splice(0,200), false);
        }
      }

      if (pdbList.length > 0) {
        while (pdbList.length){
            getUniProtIDFromPDB(pdbList.splice(0,200), true);

        }
      }

      if (giList.length > 0) {
        while (giList.length){
          getDataFromNCBI(giList.splice(0,200), true)
        }
      }
      if (ncbiList.length > 0) {
        while (ncbiList.length){
        getDataFromNCBI(ncbiList.splice(0,200), false);

      }
      }
    }
    }


  });





});

function convertToNCBI(records, speciesData){

    if (speciesData != null) {

      for (var record in records) {
          path = "*/DocSum/Item[@Name='Gi'][contains(., '" + records[record].id.split("|")[1] + "')]/../Item[@Name='AccessionVersion']/text()";

            var node = speciesData.evaluate(path, speciesData, null, XPathResult.ANY_TYPE, null);

            try {
              var thisNode = node.iterateNext();
              while (thisNode) {

                records[record].id = thisNode.textContent
                thisNode = node.iterateNext();
              }
            } catch (e) {
              bootstrap_alert.warning('Error: There was a problem reading the XML records ' + e);
            }


      }

      getIDFromNCBI(records, speciesData);

    }

  }



function getIDString(records, database){
  
  idString = "";

  if ( database == "UniProt"){
    linker = "+OR+id:";
  }

  else if (database == "PDB"){
    linker = "+OR+"
  }

  else if (database == "NCBI"){
    linker = ",";
  }

  for (var i = 0, size = records.length; i < size; i++) {
    if (database == "PDB") {
      idString += records[i].uniprot_id + linker;
    }
    else {
      idString += records[i].id + linker;

    }
  }

  // Remove the final linker string that was added
  idString = idString.substring(0, idString.length - linker.length);
  return idString;
}

function formatTaxonID(records) {


  idString = "";
  linker = ",";
  trim = 1;

  for (var i = 0, size = records.length; i < size; i++) {
    if (records[i].taxon.length > 1) {
      idString += records[i].taxon + linker;

    }
  }

  idString = idString.substring(0, idString.length - trim);
  return idString;

}

function getDataFromUniprot(records, pdb) {

  obsoleteList = [];
  speciesDict = {};
  geneDict = {};
  entryNameDict = [];
  if (pdb){
    idString = getIDString(records, "PDB");
    url = "https://www.uniprot.org/uniprot/?query=" + idString +"&format=tab&columns=id,entry%20name,protein%20names,organism,organism%20id,lineage-id(all),reviewed";



  }

  else {
    idString = getIDString(records, "UniProt");
    url = "https://www.uniprot.org/uniprot/?query=id:" + idString +"&format=tab&columns=id,entry%20name,protein%20names,organism,organism%20id,lineage-id(all),reviewed";

  }

  var promise = $.ajax({
    url: url,
    type: 'POST',
    headers: {
        'Content-Type':'text/plain'
     },
    async: true,


    success: function(speciesData) {


        splitData = speciesData.split("\n");

        for (var line in splitData) {
          if (splitData[line] != null){
          splitLine = splitData[line].split("\t");

          // If it is a PDB entry we need to grab the id name from the entry name field, to map back from the uniprotToPDB Map
          if (pdb){
            idName = uniProtToPDB.get(splitLine[1])
          }

          else {
            idName = splitLine[0]
          }

          if (splitLine[2] != null){

            if (splitLine[2].includes("Deleted") || (splitLine[2].includes("Merged"))) {
              obsoleteList.push(splitLine[0]);
            }

            else {


              taxonList = splitLine[4].split(",");

              speciesDict[idName] = taxonList[taxonList.length - 1].trim();
            // Add the gene information back to the record
              geneDict[idName] = splitLine[2];
              entryNameDict[idName] = splitLine[1];

            }
              }
          }
        }



            for (var record in records){

              if (records[record].id in speciesDict){
                records[record].taxon = speciesDict[records[record].id];
              }

              if (records[record].id in geneDict){
                records[record].headerInfo.geneName = geneDict[records[record].id];
              }


             if (records[record].id in entryNameDict){
               records[record].id_name = entryNameDict[records[record].id];
             }
          }

      getSpeciesNameFromNCBI(records, idString, obsoleteList);


    },
    error: function(XMLHttpRequest, textStatus, errorThrown) { 
      if (errorThrown == "Bad Request"){
        response = XMLHttpRequest.responseText;
        alert(response.substring(response.indexOf("<ERROR>") +7, response.indexOf("</ERROR>")) + "\n List of IDs was " + idString + "\n" + records.length + " sequences failed as a result of this and have been added to unmappable");

        obsoleteList = [];
        sortOutput(records, obsoleteList);
      
      }

      else {

        generateAlert(records);

      }

    }   
  });
}


function getDataFromNCBI(records, gi) {

  idString = getIDString(records, "NCBI");

    if (aaOpt){

      urlDoc = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=protein&id=" + idString + "&retmode=xml&rettype=docsum";

    }

    else {

      urlDoc = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=nucleotide&id=" + idString + "&retmode=xml&rettype=docsum";

    }

  var promise = $.ajax({
    url: urlDoc,

    type: 'POST',

    headers: {
        'Content-Type':'text/plain'
     },


    async: true,

    success: function(speciesData) {

      if (gi) {

        convertToNCBI(records, speciesData);

      }

      else {
        getIDFromNCBI(records, speciesData);
      }
    },


    error: function(XMLHttpRequest, textStatus, errorThrown) { 
      if (errorThrown == "Bad Request"){
        obsoleteList = [];
        sortOutput(records, obsoleteList);
        bootstrap_alert.warning("There was an error when trying to reach this URL:<br> " + '<a href=' + urlDoc + '>' +urlDoc+ '</a>');

      }

      else {
        generateAlert(records);
      }

    }   


  });

}


function getIDFromNCBI(records, speciesData) {

  fullList = [];
  obsoleteList = [];

  if (speciesData != null) {

    for (var record in records) {

      if (headerFormat){

      if (headerFormat.includes("geneName")){
        path = "*/DocSum/Item[@Name='AccessionVersion'][contains(., '" + records[record].id + "')]/../Item[@Name='Title']/text()";

          var node = speciesData.evaluate(path, speciesData, null, XPathResult.ANY_TYPE, null);

          try {
            var thisNode = node.iterateNext();
            while (thisNode) {

              records[record].headerInfo.geneName = thisNode.textContent.split("[")[0];
              thisNode = node.iterateNext();
            }
          } catch (e) {
            bootstrap_alert.warning('Error: There was a problem reading the XML records ' + e);
          }

        
      }

    }

        // This is the part where I might need to grab clean accessionversion
        // path = "*/DocSum/Id[contains(., '" + records[record].id + "')]/following-sibling::Item[@Name='AccessionVersion']/text()"
        // path = "*/DocSum/Id[contains(., '" + records[record].id + "')]/following-sibling::Item[@Name='TaxId']/text()"
        path = "*/DocSum/Item[@Name='AccessionVersion'][contains(., '" + records[record].id + "')]/../Item[@Name='TaxId']/text()";
        var node = speciesData.evaluate(path, speciesData, null, XPathResult.ANY_TYPE, null);

        try {
          var thisNode = node.iterateNext();
          while (thisNode) {

            records[record].taxon = thisNode.textContent;
            records[record].type = '';
            thisNode = node.iterateNext();
          }
        } catch (e) {
          bootstrap_alert.warning('Error: There was a problem reading the XML records ' + e);
        }

      
      obsoleteCheck = "//DocSum[Item[contains(., 'suppressed')] or contains(., 'replaced')]//Item[@Name='AccessionVersion']/text()";

      obsoleteNode = speciesData.evaluate(obsoleteCheck, speciesData, null, XPathResult.ANY_TYPE, null);

      try {
        thisObsoleteNode = obsoleteNode.iterateNext();

        while (thisObsoleteNode) {
          obsoleteList.push(thisObsoleteNode.textContent);
          thisObsoleteNode = obsoleteNode.iterateNext();
        }
      } catch (e) {
        bootstrap_alert.warning('Error: There was a problem reading the XML records ' + e);
      }

    }


    getSpeciesNameFromNCBI(records, idString, obsoleteList);



  }

}


function getSpeciesNameFromNCBI(records, idString, obsoleteList) {

  speciesList = [];

  idString = formatTaxonID(records);
  urlAll = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=taxonomy&id=" + idString + "&retmode=xml&rettype=all";

  var promise = $.ajax({
    url: urlAll,
    type: 'POST',

    headers: {
        'Content-Type':'text/plain'
     },
    async: true,

    success: function(speciesData) {

      if (speciesData != null) {


        for (var record in records){
          if (records[record].taxon.length > 1) {

            path = "";



            if (headerFormat){
              headerFormat.forEach(function(headerOpt) {


                if ( headerOpt == 'speciesName') {
                  path = "(//TaxId[.//text()='" + records[record].taxon + "']/../ScientificName)[1]";
                }

                else if ( headerOpt == 'commonName') {
                  path = "(//TaxId[.//text()='" + records[record].taxon + "']/../OtherNames/GenbankCommonName)[1]";
                }

                else if (headerOpt == 'geneName') {
                  return;
                  }

                else {
                  path = " (//TaxId[.//text()='" + records[record].taxon + "']/../LineageEx/Taxon/Rank[.//text()='" + headerOpt + "']/../ScientificName)[1]";
                }
                 
            var node = speciesData.evaluate(path, speciesData, null, XPathResult.ANY_TYPE, null);


          try {
            var thisNode = node.iterateNext();


            species = "";

            taxoncount = 0;



              while (thisNode) {
                taxoncount +=1;


                // If user has chosen to add square brackets around species name
                if (headerOpt == 'speciesName' && addSquareBrackets){
                  records[record].headerInfo[headerOpt] = "[" + thisNode.textContent + "]"; 
                }


                else {
                  //TODO: Temp fix to clean up the common name
                  records[record].headerInfo[headerOpt] =  thisNode.textContent.replace(/'/g, ""); 


                }


                thisNode = node.iterateNext();

                  
          }

          } catch (e) {
            bootstrap_alert.warning('Error: There was a problem reading the XML records ' + e);
          }

          });
            }


        }
      }
    }

      sortOutput(records, obsoleteList);

    },
    error: function(XMLHttpRequest, textStatus, errorThrown) { 
      if (errorThrown == "Bad Request"){

        obsoleteList = [];
        sortOutput(records, obsoleteList);
      
      }

      else {
        generateAlert(records);

      }




    }   


  });


}

function getUniProtIDFromPDB(records, speciesData) {

  idString = getIDString(records, "UniProt");
  url = "https://www.uniprot.org/uploadlists/?from=PDB_ID&to=ID&query=" + idString +"&format=tab";

  var promise = $.ajax({
    url: url,
    type: 'POST',

    headers: {
        'Content-Type':'text/plain'
     },
    async: true,

    success: function(speciesData) {

      splitData = speciesData.split("\n");
      for (var line in splitData) {
        if (splitData[line] != null){
          splitLine = splitData[line].split("\t");
          uniProtToPDB.set(splitLine[1], splitLine[0])
          PDBToUniProt.set(splitLine[0], splitLine[1])
          }
        }

        for (var record in records){
 
          if (PDBToUniProt.has(records[record].id)){
            records[record].uniprot_id = PDBToUniProt.get(records[record].id);
          }
      }

          getDataFromUniprot(records, true);


        },
        error: function(XMLHttpRequest, textStatus, errorThrown) { 
          if (errorThrown == "Bad Request"){
            response = XMLHttpRequest.responseText;
            alert(response.substring(response.indexOf("<ERROR>") +7, response.indexOf("</ERROR>")) + "\n List of IDs was " + idString + "\n" + records.length + " sequences failed as a result of this and have been added to unmappable");

            obsoleteList = [];
            sortOutput(records, obsoleteList);
          
          }

          else {

            generateAlert(records);

          }

        }   
      });
    }


function sortOutput(records, obsoleteList) {

  ncbiCheck = [];

  // Check to see if there are any illegal characters
  for (var i in records) {
    if ((records[i].headerInfo == null || records[i].taxon == "") && !(obsoleteList.includes(records[i].id))) {

      if (records[i].ncbiChecked == true) {

        records[i].appendTo = "badIds";
        finishedRecords.push(records[i]);
        count +=1;
      } else {

        records[i].ncbiChecked = true;
        ncbiCheck.push(records[i]);
      }
    } else if (checkObsolete && obsoleteList.includes(records[i].id)) {

        records[i].appendTo = "obsoleteSeqs";
        finishedRecords.push(records[i]);

        count +=1;
    } 

    else {

      if (invalidChars && invalidCharsRegex.test(records[i].seq)) {
        records[i].appendTo = "badCharacters";
        finishedRecords.push(records[i]);

        count +=1;

    } else {
    // User has specified not to just retain the first ID, and there are multiple IDs
    if (records[i].originalHeader.split(">").length > 2) {

      if (!retainFirst) {

        records[i].appendTo = "badIds";
        finishedRecords.push(records[i]);

        count +=1;
        break;
      }

      else {


        records[i].appendTo = "cleanedSeqs";
        finishedRecords.push(records[i]);

        count += 1;
        // progressText(count);
      }

    }

    else {


      records[i].appendTo = "cleanedSeqs";
      finishedRecords.push(records[i]);

      count += 1;
      // progressText(count);
    }
    }
  }
}

progressText(count);
checkFinal(count, finishedRecords);



if (ncbiCheck.length > 0){  
  getDataFromNCBI(ncbiCheck);
}
}


function appendOutput(records){

  records.sort(function (a, b) {
    return a.order - b.order;
  });

  limit = 1000;



  var badIDsCount, obsoleteCount, badCharCount, cleanedCount;

  badIDsCount = obsoleteCount =badCharCount = cleanedCount = 0;


  if (numRecords > limit) {
    bootstrap_alert.warning("Records are too large to write out to fields. Download file for full records");
    limit = 100;
  }


  for (var i in records){

      
      if (records[i].appendTo == "badIds" && removeUncleaned){

        output = records[i].originalHeader + records[i].seq.replace(/-/g, "&#8209;") + "&#010;"; //Replace hyphens with non-breaking hyphens
        
        
        badIdsResults += output.trim();
        if (badIDsCount < limit) {
        $("#badIds").append(output.trim());
        badIDsCount += 1;
      }
      }

      else if ( records[i].appendTo == "obsoleteSeqs" && removeObsolete){
        output= records[i].originalHeader + records[i].seq.replace(/-/g, "&#8209;") + "&#010;"; //Replace hyphens with non-breaking hyphens
        
        obsoleteSeqsResults += output.trim();
        if (obsoleteCount < limit){
          $("#obsoleteSeqs").append(output.trim());
          obsoleteCount +=1;

        }



      }

      else if (records[i].appendTo == "badCharacters"){
        output = records[i].originalHeader + records[i].seq.replace(/-/g, "&#8209;") + "&#010;"; //Replace hyphens with non-breaking hyphens
        badCharactersResults += output.trim();

        if (badCharCount < limit){
          $("#badCharacters").append(output.trim());
          badCharCount +=1;

        }

      }

  

      else if (records[i].appendTo == "cleanedSeqs" || (records[i].appendTo == "badIds" && !removeUncleaned) || (records[i].appendTo == "obsoleteSeqs" && !removeObsolete) ) {
        formattedType = records[i].type;
        if (ids_with_underscores.indexOf(formattedType) >= 0){
          formattedType = "";
        }
        else if (records[i].type.length > 0) {

          formattedType += idChar;

        }

        headerOutput = "";

        if (headerFormat && ! replaceHeadersDB){

          headerFormat.forEach(function(headerOpt) {


            if (headerOpt == "geneName"){

              if (records[i].headerInfo[headerOpt]){
                // Check that we're not doubling up on the character to split gene info and species names
                if (headerOutput.slice(-1) == geneChar){
                  headerOutput += records[i].headerInfo[headerOpt].trim() + geneChar;
                }
                else {
                  headerOutput += geneChar + records[i].headerInfo[headerOpt].trim() + geneChar;

                }

              }

              else {


                // If we don't have an existing list of sequences that failed on this taxonomic rank, create one
                if (!infoErrors[headerOpt]){
                  infoErrors[headerOpt] = records[i].id + " ";

                }

                // Otherwise add to it 
                else {
                  infoErrors[headerOpt] += records[i].id + " ";


                }
                            }
            }

            else if (headerOpt == "speciesName"){

              if (records[i].headerInfo[headerOpt]){

                if (removeSpeciesBrackets) {



                  finalSpeciesName = records[i].headerInfo[headerOpt].trim().replace(/\(|\)/g, '');
                }

                else {

                  finalSpeciesName = records[i].headerInfo[headerOpt].trim();

                }


              if (headerOutput.slice(-1) == speciesChar){
                headerOutput += finalSpeciesName + speciesChar;
              }
              else {
                headerOutput += speciesChar + finalSpeciesName + speciesChar;

              }

            }

            else {


              // If we don't have an existing list of sequences that failed on this taxonomic rank, create one
              if (!infoErrors[headerOpt]){
                infoErrors[headerOpt] = records[i].id + " ";

              }

              // Otherwise add to it 
              else {
                infoErrors[headerOpt] += records[i].id + " ";


              }
                        }

            }

            else {


              if (records[i].headerInfo[headerOpt]){

                // Check that we're not doubling up on the character to split taxon info
                if (headerOutput.slice(-1) == taxonChar){

                headerOutput += records[i].headerInfo[headerOpt].trim() + taxonChar;
              }

                else {

                  headerOutput += taxonChar + records[i].headerInfo[headerOpt].trim() + taxonChar;


                }
            }

            else {


              // If we don't have an existing list of sequences that failed on this taxonomic rank, create one
              if (!infoErrors[headerOpt]){
                infoErrors[headerOpt] = records[i].id + " ";

              }

              // Otherwise add to it 
              else {
                infoErrors[headerOpt] += records[i].id + " ";


              }
            }

            }

          });
      }

        // If it is a UniProt seqeunce, we need to add back in some formatting
        if (records[i].type == 'tr' || records[i].type == 'sp' || records[i].type == 'gi' ){

          if (stripUniProtID == 'uniprotFormat1'){
            if (records[i].id_name.length > 0){
              var header = ">" + formattedType.trim() + "|" +  records[i].id.trim() + "|" + records[i].id_name.trim() + idChar + headerOutput.trim();
            }
            else
              var header = ">" + formattedType.trim() + "|" +  records[i].id.trim() + idChar + headerOutput.trim();

          }

          else if (stripUniProtID == 'uniprotFormat2')  {
            var header = ">" + formattedType.trim() + "|" +  records[i].id.trim() + idChar + headerOutput.trim();
          }

          else if (stripUniProtID == 'uniprotFormat3') {
            var header = ">" +  records[i].id.trim() + idChar + headerOutput.trim();

          }

        }

        else {

          var header = ">" + formattedType.trim() + records[i].id.trim() + idChar + headerOutput.trim();

        }


        // Keeping the original headers (after checking databases) and getting rid of certain characters
        if (replaceHeadersDB){
          header = records[i].originalHeader.replace(replaceHeadersRegex, "").trim();
        }

        // If we're getting rid of certain characters from the header, let's do that
        if (invalidHeadChars){
          header = header.replace(invalidHeaderCharsRegex, "").trim();
        }
        // If we're adding underscores in case of spaces, let's do that
        if (addUnderscores) {
          header = header.trim().replace(/ /g, "_") ;
        }

        // Save the final header so we can write it to the summary file
        records[i].finalHeader = header;

        // Add in a newline character to the header
        header += "&#010;";


        output = header.trim()  + records[i].seq.replace(/-/g, "&#8209;") + "&#010;"; //Replace hyphens with non-breaking hyphens
        
        cleanedSeqsResults += output.trim();

        if (cleanedCount < limit){
        $("#cleanedSeqs").append(output.trim());
      }

        cleanedCount +=1;

    }
  
  }
}


function downloadFile(filename, text) {

  
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text.replace(/‑/g, "-")));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}



function downloadSummary(filename) {
  if (summary != null){
    download(summary, filename.split('_')[0] + "_summary.txt", "text/plain");
  }

}

function split(str, char) {
 var i = str.indexOf(char);

 if(i > 0)
  return  str.slice(0, i);
 else
  return str;     
}

// Append escape characters to strings with special regex characters

function escapeRegExp(str) {
    return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

// Get the values from the save output form
$("form#save").submit(function(event) {
  event.preventDefault();

  var outputZip = new JSZip();
  var val = [];

  $('.downloadCheck:checkbox:checked').each(function(i){
    itemName = $(this).val();
    if (itemName == "treeDL"){

      if (cleanTree){
        cleanedTree = cleanTreeNames();
        outputZip.file('cleanedTree.nwk', cleanedTree);
      }

      else {
        bootstrap_alert.warning("You requested a phylogenetic tree but there is no cleaned tree available.");

      }

    }

    else if (itemName == "csvDL"){
      
      if (summaryCSV.length > 1){
        outputZip.file('summary.csv', summaryCSV);
      }

      else {
        bootstrap_alert.warning("You requested a CSV but there is no CSV file generated.");

      }
    }

    else if (itemName == "summaryDL"){
      
      if (summary.length > 1){
        outputZip.file('summary.txt', summary);
      }

      else {
        bootstrap_alert.warning("You requested a summary but there is no summary generated.");

      }


    }

    else {

      // If we haven't written all the sequences
      if (numRecords > limit){

        if ($(this).val() == "cleanedSeqs"){
          var item = cleanedSeqsResults.replace(/&#8209;/g, "-").replace(/&#010;/g, "\r\n");
        }

        else if ($(this).val() == "badCharacters"){
          var item = badCharactersResults.replace(/&#8209;/g, "-").replace(/&#010;/g, "\r\n");
        }

        else if ($(this).val() == "obsoleteSeqs"){
          var item = obsoleteSeqsResults.replace(/&#8209;/g, "-").replace(/&#010;/g, "\r\n");
        }

        else if ($(this).val() == "badIds"){
          var item = badIdsResults.replace(/&#8209;/g, "-").replace(/&#010;/g, "\r\n");
        }

      }

      // We can take the sequences directly from the text output fields.
      else {
        var item = $('textarea#' + $(this).val()).val().replace(/‑/g, "-");
      }

      outputZip.file($(this).val() + '.fasta', item);
    }

      });

  outputZip.generateAsync({type:"blob"})
  .then(function (blob) {
      saveAs(blob, "SeqScrubFiles.zip");
  });



  var cleanText = $('textarea#cleanedSeqs').val();
  var illegalcharText = $('textarea#cleanedSeqs').val();


});


// Allow for easy selection of full text in each window

$("#cleanedSeqs").click(function() {
  $("#cleanedSeqs").select();
});

$("#badCharacters").click(function() {
  $("#badCharacters").select();
});

$("#obsoleteSeqs").click(function() {
  $("#obsoleteSeqs").select();
});

$("#badIds").click(function() {
  $("#badIds").select();
});

/*
  Dropdown with Multiple checkbox select with jQuery - May 27, 2013
  (c) 2013 @ElmahdiMahmoud
  license: https://www.opensource.org/licenses/mit-license.php
*/

$(".dropdown dt a").on('click', function() {
  $(".dropdown dd ul").slideToggle('fast');
});

$(".dropdown dd ul li a").on('click', function() {
  $(".dropdown dd ul").hide();
});

function getSelectedValue(id) {
  return $("#" + id).find("dt a span.value").html();
}


// Either allow for databases to be queried or just the header to be cleaned
$('#replaceCharsCheck').click(function(event){
  $(".dataCheck").prop('checked', false);
  $(".obsoleteCheck").prop('checked', false);
  $('#replaceHeadersDBCheck').prop('checked', false);


});

$('#replaceHeadersDBCheck').click(function(event){
  $(".dataCheck").prop('checked', false);
  $('#replaceCharsCheck').prop('checked', false);

});



$(".dataCheck").click(function(event){
  $('#replaceCharsCheck').prop('checked', false);
  $('#replaceHeadersDBCheck').prop('checked', false);
});

$(".obsoleteCheck").click(function(event){
  $('#replaceCharsCheck').prop('checked', false);
});




$('#input-draggable').selectize({
    plugins: ['drag_drop'],
    delimiter: ',',
    persist: false,
    create: function(input) {
        return {
            value: input,
            text: input
        };
    }
});

$('.input-sortable').selectize({
    plugins: ['drag_drop'],
    persist: false,
    create: true
});



$('#header-format').selectize({
    maxItems: null,
    valueField: 'id',
    labelField: 'title',
    searchField: 'title',
    plugins: ['drag_drop', 'remove_button'],
    create: false,
    highlight: true,


});


$(function() {
  var $wrapper = $('#wrapper');

  // theme switcher
  var theme_match = String(window.location).match(/[?&]theme=([a-z0-9]+)/);
  var theme = (theme_match && theme_match[1]) || 'default';
  var themes = ['default','legacy','bootstrap2','bootstrap3'];

  var $themes = $('<div>').addClass('theme-selector').insertAfter('h1');
  for (var i = 0; i < themes.length; i++) {
    $themes.append('<a href="?theme=' + themes[i] + '"' + (themes[i] === theme ? ' class="active"' : '') + '>' + themes[i] + '</a>');
  }

  // display scripts on the page
  $('script', $wrapper).each(function() {
    var code = this.text;
    if (code && code.length) {
      var lines = code.split('\n');
      var indent = null;

      for (var i = 0; i < lines.length; i++) {
        if (/^[  ]*$/.test(lines[i])) continue;
        if (!indent) {
          var lineindent = lines[i].match(/^([  ]+)/);
          if (!lineindent) break;
          indent = lineindent[1];
        }
        lines[i] = lines[i].replace(new RegExp('^' + indent), '');
      }

      code = $.trim(lines.join('\n')).replace(/ /g, '    ');
      var $pre = $('<pre>').addClass('js').text(code);
      $pre.insertAfter(this);
    }
  });

  // show current input values
  $('select.selectized,input.selectized', $wrapper).each(function() {
    var $container = $('<div>').addClass('value').html('Current Value: ');
    var $value = $('<span>').appendTo($container);
    var $input = $(this);
    var update = function(e) { $value.text(JSON.stringify($input.val())); };

    $(this).on('change', update);
    update();

    $container.insertAfter($input);
  });
});

function generateAlert(records){
  bootstrap_alert.warning("There was a fatal error <br>" + records.length + " sequences are being written to unmappable" );
  obsoleteList = [];
  sortOutput(records, obsoleteList);

  if (count != numRecords) {
    bootstrap_alert.warning("Please note: Currently not all sequences have been written to an output field");
  }
  else {
    bootstrap_alert.warning ("Please note: Despite the error, all sequences have still been written to an output field");
  }

  hideLoadingScreen();
}

//Error handing
bootstrap_alert = function() {};
bootstrap_alert.warning = function(message) {
            $('#error-div').show();

            $('#error-div').append('<div class="alert alert-danger alert-dismissable"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button><span>'+message+'</span></div>')
        };
bootstrap_alert.tree = function(message) {
            $('#error-div').show();

            $('#treeOutput').html('<div class="success alert-dismissable"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button><span>'+message+'</span></div>')
        };
bootstrap_alert.clear =  function(message) {
            $('#error-div').empty();
            $('#error-div').hide();
        };

$(document).bind('click', function(e) {
  var $clicked = $(e.target);
  if (!$clicked.parents().hasClass("dropdown")) $(".dropdown dd ul").hide();
});

$('.multiSelect input[type="checkbox"]').on('click', function() {

  var title = $(this).closest('.multiSelect').find('input[type="checkbox"]').val(),
  title = $(this).val() + ",";

  if ($(this).is(':checked')) {
    var html = '<span title="' + title + '">' + title + '</span>';
    $('.multiSel').append(html);
    $(".hida").hide();
  } else {
    $('span[title="' + title + '"]').remove();
    var ret = $(".hida");
    $('.dropdown dt a').append(ret);

  }
});

function checkAll(ele) {
    var checkboxes = $(".downloadCheck");
    if (ele.checked) {
        for (var i = 0; i < checkboxes.length; i++) {
            if (checkboxes[i].type == 'checkbox' && ! checkboxes[i].disabled) {
                checkboxes[i].checked = true;
                $("#selectAllLabel").html('Deselect all output');
            }
        }
    } else {
        for (var i = 0; i < checkboxes.length; i++) {
            if (checkboxes[i].type == 'checkbox' && ! checkboxes[i].disabled) {
                checkboxes[i].checked = false;
                $("#selectAllLabel").html('Select all output');

            }
        }
    }
}
