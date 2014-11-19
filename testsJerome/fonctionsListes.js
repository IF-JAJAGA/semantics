var example = [
	{
		"sujet" : "anything0",
		"nbApparitions" : "2"
	},
  
	{
		"sujet" : "anything1",
		"nbApparitions" : "6"
	},
	{
		"sujet" : "anything3",
		"nbApparitions" : "10"
	},
	{
		"sujet" : "anything4",
		"nbApparitions" : "8"
	},
	{
		"sujet" : "anything5",
		"nbApparitions" : "5"
	}
]
;


function find(subject, list){
	for (var i = 0, len = list.length; i < len; i++) {
		if(list[i].sujet == subject){
			console.log(list[i].nbApparitions);
			return list[i];
		}
	}
	console.log("Pas toruvé");
	return undefined;

}


var elementTrouve = find("anything6", example);

console.log(elementTrouve.sujet);
console.log(elementTrouve.nbApparitions);
