class Address {
  final String fullName;
  final String phoneNumber;
  final String streetAddress;
  final String province;
  final String district;
  final String commune;
  bool isDefault;

  Address({
    required this.fullName,
    required this.phoneNumber,
    required this.streetAddress,
    required this.province,
    required this.district,
    required this.commune,
    this.isDefault = false,
  });

  factory Address.fromJson(Map<String, dynamic> json) {
    return Address(
      fullName: json['name'],
      phoneNumber: json['phone'],
      streetAddress: json['street'],
      province: json['province'],
      district: json['district'],
      commune: json['commune'],
      isDefault: json['isDefault'] ?? false,
    );
  }
}
