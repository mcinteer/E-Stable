using System.Collections.Generic;
using System.Web;
using EStable.Constants;

namespace EStable.Models.Wizard
{
    public class ContactInformationWizard : StableWizardBase
    {
        public ContactInformationWizard(HttpCookie cookie)
        {
            Email = cookie[Codes.Cookies.Wizard.StepOne.Email];
            StableName = cookie[Codes.Cookies.Wizard.StepOne.StableName];
            Address = cookie[Codes.Cookies.Wizard.StepOne.Address];
            Jurisdiction = cookie[Codes.Cookies.Wizard.StepOne.Jurisdiction];
            Phone = cookie[Codes.Cookies.Wizard.StepOne.Phone];
            StableType = cookie[Codes.Cookies.Wizard.StepOne.StableType];
            Mobile = cookie[Codes.Cookies.Wizard.StepOne.Mobile];
            Trainer = cookie[Codes.Cookies.Wizard.StepOne.Trainer];
            Fax = cookie[Codes.Cookies.Wizard.StepOne.Fax];
        }

        public ContactInformationWizard()
        {
            
        }

        public List<string> PossibleStableType = new List<string>()
            {
                "Thoroughbred", 
                "Pacer", 
                "Trotter", 
                "Greyhound", 
                "Other"
            };

        public string Fax { get; set; }

        public string StableType { get; set; }

        public string Jurisdiction { get; set; }

        public string StableName { get; set; }

        public string Trainer { get; set; }

        public string LegalEntity { get; set; }

        public string Mobile { get; set; }

        public string Phone { get; set; }

        public string Address { get; set; }

        public void Merge(ContactInformationWizard contactInformation)
        {
            this.Address = this.Address ?? contactInformation.Address;
            this.Email = this.Email ?? contactInformation.Email;
            this.Fax = this.Fax ?? contactInformation.Fax;
            this.Jurisdiction = this.Jurisdiction ?? contactInformation.Jurisdiction;
            this.LegalEntity = this.LegalEntity ?? contactInformation.LegalEntity;
            this.Mobile = this.Mobile ?? contactInformation.Mobile;
            this.Phone = this.Phone ?? contactInformation.Phone;
            this.StableName = this.StableName ?? contactInformation.StableName;
            this.StableType = this.StableType ?? contactInformation.StableType;
            this.Trainer = this.Trainer ?? contactInformation.Trainer;
        }
    }
}