using EStable.Models.Wizard;
using EStable.ViewModels.UserOfStableViewModels.Wizard.StepOne;

namespace EStable.ViewModels.UserOfStableViewModels.Wizard.Factories
{
    public interface IContactDetailsViewModelFactory
    {
        ContactDetailsViewModel ToViewModel(ContactInformationWizard contact);
        ContactInformationWizard ToDomainObject(ContactDetailsViewModel viewModel);
    }

    public class ContactDetailsViewModelFactory :IContactDetailsViewModelFactory
    {
        public ContactDetailsViewModel ToViewModel(ContactInformationWizard contact)
        {
            return new ContactDetailsViewModel(contact);
        }

        public ContactInformationWizard ToDomainObject(ContactDetailsViewModel viewModel)
        {
            return new ContactInformationWizard()
            {
                Address = viewModel.Address,
                Email = viewModel.Email,
                Fax = viewModel.Fax,
                Jurisdiction = viewModel.Jurisdiction,
                LegalEntity = viewModel.LegalEntity,
                Mobile = viewModel.Mobile,
                Phone = viewModel.Phone,
                StableName = viewModel.StableName,
                StableType = viewModel.StableType,
                Trainer = viewModel.Trainer
            };
        }
    }
}