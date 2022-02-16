<?php

function cors() {

    // Allow from any origin
    if (isset($_SERVER['HTTP_ORIGIN'])) {
        // Decide if the origin in $_SERVER['HTTP_ORIGIN'] is one
        // you want to allow, and if so:
        header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Max-Age: 86400');    // cache for 1 day
    }

}

// Setup directory to store uploads
$target_dir = "uploads/";
$target_file = $target_dir . basename($_FILES["file"]["name"]);
$tree_file = $target_dir . basename($_FILES["tree"]["name"]);

$returnArray = array();

// Pattern to check if line is a header
$headerPattern = "/^>.*/";
$seq = '';
$seqCount = 0;

$string_name = (string)$target_file;

// Upload file
$moved = move_uploaded_file($_FILES["file"]["tmp_name"],  $target_file );



if( $moved ) {
} else {
  echo "Not uploaded because of error #".$_FILES["file"]["error"];
}

if ($_FILES["tree"]["name"]){
	$moved = move_uploaded_file($_FILES["tree"]["tmp_name"],  $tree_file );
}

$file = fopen($target_file, 'rb');
while (($line = fgets($file)) !== false){
	
	// Clean up any instances of repeating pipe symbols
	$line = str_replace("||", "|", $line);
	
	// If we are at an identifier
	if (preg_match($headerPattern, $line)){
		if ($seq != ''){
			$returnArray[$seqCount]['seq'] = $seq;
			$seq = '';
			$seqCount +=1;
		}

		$lineArray = preg_split("/[\s,|_\/]+/", $line);

		$type = substr($lineArray[0], 1);
		$id = "";
		$id_name = "";



		// Add the type (NCBI or UniProt) back into the array as the actual letter code
		if ($type == "XP" || $type == "XM" || $type == "XR" || $type == "WP" || $type == "NP" || $type == "NC" || $type == "NG" || $type == "NM" || $type == "NR") {
			$id = $type . "_" . $lineArray[1];

		} elseif ($type == "gi") {
			$id = $type . "|" . $lineArray[1];

	

		} elseif ($type == "pdb" || $type == "sp" || $type == "tr" ){
			$id = $lineArray[1];
			$uniprotArray = preg_split("/[\s,\/]+/", $line);
			$uniProtstring = print_r($uniprotArray[0], true);
			$idArray = preg_split("/[\s,|]+/", $uniProtstring);


			for ($i = 2; $i < count($idArray); $i++) {
				$id_name = $id_name . "_" . $idArray[$i];
			}

			$id_name = ltrim($id_name,"_");


			// $id_name = $idArray[1] . "_" . $idArray[2];
			// $id_name = $uniProtstring;
		


		} else {
			$id = $type;
			$type = "";
			

		}


		// Prepare the array for returning
		$returnArray[] = array('originalHeader' => $line, 'type' => $type ,'id' => $id, 'id_name' => $id_name);

	}

	else {

	// Add all of the lines of the sequence to the sequence object
	$seq .= str_replace(array("\r\n", "\n\r", "\n", "\r"), '', $line);
	}
}




// Create object to return

$returnArray[$seqCount]['seq'] = $seq;

$file = fopen($tree_file, 'rb');
while (($line = fgets($file)) !== false){
	$returnArray[$seqCount + 1]['tree'] = $line;
	}



$jsonData = json_encode($returnArray);
echo $jsonData;


?>