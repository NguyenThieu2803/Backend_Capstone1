const Card = require("../model/Usermodel/Card");

const addCard = async (params) => {
  try {
    const card = new Card({
      user_id: params.user_id,
      Card_name: params.Card_name,
      Cardnumber: params.Cardnumber,
      cardExpmonth: params.cardExpmonth,
      cardExpyears: params.cardExpyears,
      cardCVC: params.cardCVC,
    });
    await card.save();
    return card;
  } catch (error) {
    throw new Error(error.message || "Error adding card");
  }
};

const updateCard = async (user_id, cardId, params) => {
    try {
      const card = await Card.findOneAndUpdate(
        { user_id, cardId },
        {
          Card_name: params.Card_name,
          Cardnumber: params.Cardnumber,
          cardExpmonth: params.cardExpmonth,
          cardExpyears: params.cardExpyears,
          cardCVC: params.cardCVC
        },
        { new: true }
      );
      if (!card) throw new Error("Card not found or unauthorized access");
      return card;
    } catch (error) {
      throw new Error(error.message || "Error updating card");
    }
  };

  const deleteCard = async (user_id, cardId) => {
    try {
      const card = await Card.findOneAndDelete({ user_id, cardId });
      if (!card) throw new Error("Card not found or unauthorized access");
      return card;
    } catch (error) {
      throw new Error(error.message || "Error deleting card");
    }
  };
  

const getAllCards = async (userId) => {
  try {
    const cards = await Card.find({ user_id: userId });
    return cards;
  } catch (error) {
    throw new Error(error.message || "Error retrieving cards");
  }
};

module.exports = {
  addCard,
  updateCard,
  deleteCard,
  getAllCards
};
