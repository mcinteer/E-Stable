using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EStable.Models;
using EStable.Models.Wizard;
using EStable.Models.Wizard.Stable_Wizard;
using EStable.ViewModels.UserOfStableViewModels.Wizard.Factories;
using EStable.ViewModels.UserOfStableViewModels.Wizard.StepFive;

namespace EStable.Services
{
    public interface IAnimalOwnerService
    {
        List<AjaxAnimalOwnershipViewModel> SaveAnimalOwner(string animalName, string owner, string percentOwned, string invoiced, string ownerEmail, string syndicate, string syndicateName, string dayPhone, string nightPhone, string mobilePhone, string address, string stableEmail);
    }

    public class AnimalOwnerService : IAnimalOwnerService
    {
        private readonly WizardService _wizardService =
            new WizardService();

        private readonly IAnimalOwnerViewModelFactory _factory = new AnimalOwnerViewModelFactory();
        private readonly IAjaxAnimalOwnerViewModelFactory _ajaxFactory = new AjaxAnimalOwnerViewModelFactory();

        public List<AjaxAnimalOwnershipViewModel> SaveAnimalOwner(string animalName, string owner, string percentOwned, string invoiced, string ownerEmail, string syndicate, string syndicateName, string dayPhone, string nightPhone, string mobilePhone, string address, string stableEmail)
        {
            var wizard = _wizardService.GetWizard(stableEmail);
            
            var animalOwnership = new AnimalOwnership(animalName, owner, percentOwned, invoiced, ownerEmail, syndicate, syndicateName, dayPhone, nightPhone, mobilePhone, address);
            wizard.AddAnimalOwnership(animalOwnership);

            var fileName = _wizardService.GetStableRegFileInfo(stableEmail);
            wizard.SaveXml(fileName.SystemFileName);

            return _ajaxFactory.ToViewModel(wizard.AnimalOwners.AnimalOwnerships
                                                                .Where(an => an.AnimalName == animalName));
        }

        
    }
}