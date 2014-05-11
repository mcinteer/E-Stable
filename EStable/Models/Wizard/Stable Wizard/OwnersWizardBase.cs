using System;
using System.Collections.Generic;
using System.Web;

namespace EStable.Models.Wizard
{
    public class OwnersWizardBase
    {
        public List<Owner> Owners { get; set; }

        public OwnersWizardBase()
        {
            Owners = new List<Owner>();
        }

        public void AddOwner(Owner owner)
        {
            Owners.Add(owner);
        }
    }
}