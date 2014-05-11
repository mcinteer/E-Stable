using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace EStable.Models.Wizard.Stable_Wizard
{
    public class OwnershipWizard
    {
        public List<Ownership> Ownerships { get; set; }

        public OwnershipWizard()
        {
            Ownerships = new List<Ownership>();
        }

        public void AddOwnership(Ownership ownership)
        {
            Ownerships.Add(ownership);
        }
    }
}