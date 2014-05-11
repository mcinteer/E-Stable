namespace EStable.Models
{
    public class StableAnimalChargeNote
    {
        public int StableAnimalChargeNoteId { get; set; }
        public int StableAnimalId { get; set; }
        public int EventDate { get; set; }
        public int ChargeDescription { get; set; }
        public int Value { get; set; }
        public int HasBeenInvoiced { get; set; }
    }
}