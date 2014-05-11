namespace EStable.Models
{
    public class StandardCharge
    {
        public StandardCharge()
        {
            
        }
        public StandardCharge(string description, string rate)
        {
            Description = description;
            Value = rate;
        }

        public int StandardChargeId { get; set; }
        public string StableId { get; set; }
        public string Description { get; set; }
        public string Value { get; set; }
    }
}