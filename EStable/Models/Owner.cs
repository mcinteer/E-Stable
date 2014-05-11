namespace EStable.Models
{
    public class Owner
    {
        public int OwnerId { get; set; }
        public int OwnerUserId { get; set; }
        public string OwnerName { get; set; }
        public string OwnerEmail { get; set; }
        public string SyndicatePerson { get; set; }
        public string SyndicateName { get; set; }
        public string DayPhone { get; set; }
        public string NightPhone { get; set; }
        public string MobilePhone { get; set; }
        public string Address { get; set; }
        public string InternalComments { get; set; }

        public Owner(string ownerName, string ownerEmail, string syndicate, string syndicateName, string dayPhone, string nightPhone, string mobilePhone, string address)
        {
            OwnerName = ownerName;
            OwnerEmail = ownerEmail;
            SyndicatePerson = syndicate;
            SyndicateName = syndicateName;
            DayPhone = dayPhone;
            NightPhone = nightPhone;
            MobilePhone = mobilePhone;
            Address = address;
        }
    }
}