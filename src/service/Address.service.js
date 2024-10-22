const Address = require("../model/Usermodel/Address");

const addAddress = async (params) => {
  try {
    const address = new Address(params);
    await address.save();
    return address;
  } catch (error) {
    throw new Error(error.message || "Error adding address");
  }
};

const updateAddress = async (user_id, addressId, params) => {
  try {
    const address = await Address.findOneAndUpdate(
      { _id: addressId, user_id },
      params,
      { new: true }
    );
    if (!address) throw new Error("Address not found or unauthorized access");
    return address;
  } catch (error) {
    throw new Error(error.message || "Error updating address");
  }
};

const deleteAddress = async (user_id, addressId) => {
  try {
    const address = await Address.findOneAndDelete({ _id: addressId, user_id });
    if (!address) throw new Error("Address not found or unauthorized access");
    return address;
  } catch (error) {
    throw new Error(error.message || "Error deleting address");
  }
};

const getAllAddresses = async (userId) => {
  try {
    const addresses = await Address.find({ user_id: userId });
    return addresses;
  } catch (error) {
    throw new Error(error.message || "Error retrieving addresses");
  }
};

module.exports = {
  addAddress,
  updateAddress,
  deleteAddress,
  getAllAddresses
};

