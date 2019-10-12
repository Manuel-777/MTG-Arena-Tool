const _ = require("lodash");

//
// this order matters because things like Artifact Creatures exist
const cardTypes = [
  "Land",
  "Creature",
  "Artifact",
  "Enchantment",
  "Instant",
  "Sorcery",
  "Planeswalker"
];

exports.cardType = card => {
  const result = cardTypes.find(ct => cardHasType(card, ct));
  if (!result) throw new Error("Card type could not be determined");
  return result;
};

exports.cardHasType = cardHasType;
function cardHasType(card, type) {
  if (!_.has(card, "type"))
    throw new Error("The specified card object does not have a type property");
  return card.type.includes(type + " ");
}
