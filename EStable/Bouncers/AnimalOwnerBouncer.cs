using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EStable.Models;
using EStable.Services;
using EStable.ViewModels.UserOfStableViewModels.Wizard.StepFive;

namespace EStable.Bouncers
{
    public interface IAnimalOwnerBouncer
    {
        List<AjaxAnimalOwnershipViewModel> SaveAnimalOwner(string animalName, string owner, string percentOwned, string invoiced, string ownerEmail, string syndicate, string syndicateName, string dayPhone, string nightPhone, string mobilePhone, string address, string stableEmail);
    }

    public class AnimalOwnerBouncer : IAnimalOwnerBouncer
    {
        private readonly IAnimalOwnerService _service = new AnimalOwnerService();

        public List<AjaxAnimalOwnershipViewModel> SaveAnimalOwner(string animalName, string owner, string percentOwned, string invoiced, string ownerEmail, string syndicate, string syndicateName, string dayPhone, string nightPhone, string mobilePhone, string address, string stableEmail)
        {
            return _service.SaveAnimalOwner(animalName, owner, percentOwned, invoiced, ownerEmail, syndicate,
                                            syndicateName, dayPhone, nightPhone, mobilePhone, address, stableEmail);
        }

        
    }
}