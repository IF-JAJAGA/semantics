//var 	json = require('../testToSpotlight.json');


/*
 * A partir des graphes rdf donnés dans le variable json, ce fichier génère un json (jsonOut) pour déterminer l'importances des 
 * informations et leur valeurs.
 *
 * "triolets" correspond à une liste de "prédicats" pour le sujet subject.
 * A la fin on parcourt cette sous-liste triolets pour savoir quelle valeur on met dans notre affichage.
 * {
 * 	"bestsList" : [2,0,1,3,...],
 * 	"subjectsList" : [
 * 		{	
 * 			"subject" : sujet,
 * 			"frequency" : 1,
 * 			"triolets" : [
 * 				{
 * 					"predicat" : predicat,
 * 					"type" : type,
 * 					"value" : value
 * 			},
 * 				...
 * 			]
 *
 * 		},
 * 		...
 * 	]
 * }
 *
 * avec frequency >= 1
 */




/*
 * Functions
 */
function find(sujet, subjectsList){
	for (var i = 0, len = subjectsList.length; i < len; i++) {
		if(subjectsList[i].subject == sujet){
			return i;
		}
	}
	return undefined;
}

function presentInBest(list, i){
	if(list.length == 0)	return 0;
	for(var j=0, lenj=list.length; j<lenj; j++){
		if(list[j] == i){
			return 1;
		}
	}
	return 0;
}

/*
 * Génère jsonOut.bestsList pour le classement par fréquentation.
 */
function bestSubjects(jsonOut, size){
	var toReturn = jsonOut.bestsList;
	var subjectsList = jsonOut.subjectsList;
	

	if(size > subjectsList.length)	size = subjectsList.length;

	var max = 0;
	while(toReturn.length < size){
		var maxBoucle = 0;
		var addIndice = undefined;
		for(var i=0, len=subjectsList.length; i<len; i++){
			var freqTest = subjectsList[i].frequency;
			if(freqTest > maxBoucle && (max == 0 || freqTest <= max)){
				var dejaPresent = presentInBest(toReturn, i);
				if(dejaPresent == 0) {
					addIndice = i;
					maxBoucle = freqTest;
				}
			}
		}
		toReturn.push(addIndice);
		if(max==0)	max = maxBoucle;
	}
}


/*
 * Génère jsonOut.subjectsList
 */
function explore(json, jsonOut){
	//Exclude from the analysis
	var noGood = "xmlns";
	

	var subjectsList = jsonOut.subjectsList;
	resultats = json.results;

	for(root in resultats){
		var text = resultats[root];
		for(link in text){
			if(link.indexOf(noGood) != 0 ){
				var subjectInList = find(link,subjectsList);
				if(subjectInList == undefined){
					var toAdd={
						"subject" : link,
						"frequency" : 1,
						"triolets" : []
					}
					var lien = text[link];
					for(predicat in lien){
						for(var i=0, len=lien[predicat].length ; i<len ; i++){
							var val = lien[predicat][i];
							toAdd.triolets.push(
								{
									"predicat" : predicat,
									"type" : val.type,
									"value" : val.value
								}
							);
						}
					}

					subjectsList.push(toAdd);

				}
				else {
					var toModify = subjectsList[subjectInList];
					toModify.frequency = toModify.frequency + 1;
					//On ajoute les prédicats pour le sujet
					var lien = text[link];
					for(predicat in lien){
						for(var i=0, len=lien[predicat].length ; i<len ; i++){
							var val = lien[predicat][i];
							toModify.triolets.push(
								{
									"predicat" : predicat,
									"type" : val.type,
									"value" : val.value
								}
							);
						}
					}
				}
				
				
				
			}
		}
	}
}

/*
 * End of functions
 */




// #Main
var jsonOut = {
	"bestsList" : [],
	"subjectsList" : []
}

explore(json, jsonOut);
bestSubjects(jsonOut, 10);

//Logs
console.log("bestsList : " + jsonOut.bestsList.toString());
console.log("Longueur de la liste : " + jsonOut.subjectsList.length);
for(var i=0, len=jsonOut.subjectsList.length ; i<len ; i++){
	console.log("element " + i + " apparait " + jsonOut.subjectsList[i].frequency + " fois. Taille de triolet : " + jsonOut.subjectsList[i].triolets.length);
}
