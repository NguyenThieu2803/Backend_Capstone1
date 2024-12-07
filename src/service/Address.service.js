const Address = require("../model/Usermodel/Address");

const addAddress = async (params) => {
  try {
    const addressCount = await Address.countDocuments({ user_id: params.user_id });
    if (addressCount === 0) {
      params.isDefault = true;
    }
    
    const address = new Address(params);
    await address.save();
    return address;
  } catch (error) {
    throw new Error(error.message || "Error adding address");
  }
};

const updateAddress = async (user_id, addressId, params) => {
  try {
    if (params.isDefault === true) {
      await Address.updateMany(
        { 
          user_id, 
          _id: { $ne: addressId } 
        },
        { 
          $set: { isDefault: false } 
        }
      );
    }

    const updatedAddress = await Address.findOneAndUpdate(
      { 
        _id: addressId, 
        user_id 
      },
      {
        name: params.name,
        phone: params.phone,
        street: params.street,
        district: params.district,
        ward: params.ward,
        commune: params.commune,
        city: params.city,
        province: params.province,
        isDefault: params.isDefault
      },
      { 
        new: true,
        runValidators: true 
      }
    );

    if (!updatedAddress) {
      throw new Error("Address not found or unauthorized access");
    }

    return updatedAddress;
  } catch (error) {
    throw new Error(error.message || "Error updating address");
  }
};

const deleteAddress = async (user_id, addressId) => {
  try {
    const address = await Address.findOne({ _id: addressId, user_id });
    if (!address) throw new Error("Address not found or unauthorized access");

    if (address.isDefault) {
      const nextAddress = await Address.findOne({ 
        user_id, 
        _id: { $ne: addressId } 
      });
      if (nextAddress) {
        await Address.findByIdAndUpdate(nextAddress._id, { isDefault: true });
      }
    }

    await address.remove();
    return address;
  } catch (error) {
    throw new Error(error.message || "Error deleting address");
  }
};

const getAllAddresses = async (userId) => {
  try {
    const addresses = await Address.find({ user_id: userId }).sort({ isDefault: -1 });
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

