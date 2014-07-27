namespace EStable.Models
{
    public class StableChargeType
    {
        public StableChargeType()
        {
            
        }
        public StableChargeType(string unit, string instable, string description, string rate)
        {
            ChargingUnit = unit;
            InStable = instable == "true";
            ChargeType = description;
            ChargeRate = rate;
        }

        public StableChargeType(int id, string description, string rate, string unit, bool instable)
        {
            ChargingUnit = unit;
            InStable = instable;
            ChargeType = description;
            ChargeRate = rate;
            StableChargeTypeId = id;
        }

        public int StableChargeTypeId { get; set; } 
        public int StableId { get; set; } 
        public string ChargeType { get; set; } 
        public bool InStable { get; set; } 
        public string ChargeRate { get; set; } 
        public string ChargingUnit { get; set; } 
    }
}