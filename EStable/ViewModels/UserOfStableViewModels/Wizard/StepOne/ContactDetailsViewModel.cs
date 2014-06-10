using System.Collections.Generic;
using EStable.Models.Wizard;
using EStable.ViewModels.UserOfStableViewModels.Validation;
using FluentValidation.Attributes;

namespace EStable.ViewModels.UserOfStableViewModels.Wizard.StepOne
{
    [Validator(typeof(ContactDetailsValidator))]
    public class ContactDetailsViewModel : BaseUserOfStableViewModel
    {
        public ContactDetailsViewModel()
        {
            
        }
        public ContactDetailsViewModel(ContactInformationWizard contact) : base()

        {
            Address = contact.Address;
            Email = contact.Email;
            Fax = contact.Fax;
            Jurisdiction = contact.Jurisdiction;
            LegalEntity = contact.LegalEntity;
            Mobile = contact.Mobile;
            Phone = contact.Phone;
            PossibleStableType = contact.PossibleStableType;
            StableName = contact.StableName;
            StableType = contact.StableType;
            Trainer = contact.Trainer;
            IsValid = true;
        }

        public string Fax { get; set; }

        public string StableType { get; set; }

        public string Jurisdiction { get; set; }

        public string Trainer { get; set; }

        public string LegalEntity { get; set; }

        public string Mobile { get; set; }

        public string Phone { get; set; }

        public string Address { get; set; }

        public IEnumerable<string> PossibleStableType { get; set; }

        public new bool IsValid { get; set; }

        public void InitializePossibleStableType()
        {
            PossibleStableType =  new List<string>()
            {
                "Thoroughbred", 
                "Pacer", 
                "Trotter", 
                "Greyhound", 
                "Other"
            };
        }
    }
}