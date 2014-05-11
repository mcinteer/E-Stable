using System.Web;

namespace EStable.Models
{
    public class Ownership
    {
        public int OwnerId { get; set; }
        public int StableAnimalId { get; set; }
        public string PercentOwned { get; set; }
        public string InvoiceIndicator { get; set; }
        public string Comment { get; set; }

        public Ownership()
        {   
        }

        public Ownership(string percentOwned, string invoiced)
        {
            PercentOwned = percentOwned;
            InvoiceIndicator = invoiced;
        }

     
    }
}