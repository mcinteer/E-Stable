namespace EStable.Models
{
    public class StandardCharge
    {
        public StandardCharge()
        {
            
        }
        public StandardCharge(int id, string description, string rate)
        {
            Description = description;
            Value = rate;
            StandardChargeId = id;
        }

        public int StandardChargeId { get; set; }
        public string StableId { get; set; }
        public string Description { get; set; }
        public string Value { get; set; }
    }
}