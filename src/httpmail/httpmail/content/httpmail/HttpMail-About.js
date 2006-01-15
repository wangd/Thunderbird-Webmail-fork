var gHttpMailAbout =
{  
    m_iDeckCount : 0,
    m_iCurrentDeck : 0,
    m_Timer : null,
    m_iElementCount : 2,
    m_iTime : 3000,

    init : function()
    {
        var strBundle = document.getElementById("stringsHttpMailAbout");
        var szContributors = strBundle.getString("ExtContributorNames");
        var aszNames = szContributors.split(";");
        var list = document.getElementById("HttpMailContributorBox");
        
        this.m_Timer = Components.classes["@mozilla.org/timer;1"];
        this.m_Timer = this.m_Timer.createInstance(Components.interfaces.nsITimer); 
        
        if (aszNames)     
        {   
            if (aszNames.length > this.m_iElementCount)
                this.createDeck(list, aszNames);
            else
                this.createList(list, aszNames);  
        }      
    },


    createDeck : function(base, aszNames)
    {
        var deck = document.createElement("deck"); 
        deck.setAttribute("selectedIndex", this.m_iCurrentDeck);
        deck.setAttribute("id", "DeckList");
        
        var vbox = null;
        var iCount = 0;
                
        for(i =0 ; i< aszNames.length; i++)
        {   
            if (iCount == 0) vbox = document.createElement("vbox"); 
            var hBox = this.processListItem(aszNames[i]);
            vbox.appendChild(hBox);
            iCount++;
            
            if (iCount > this.m_iElementCount)
            {
                deck.appendChild(vbox);
                iCount = 0; 
                this.m_iDeckCount++;
            }
            else if (i == aszNames.length-1)
            {
                deck.appendChild(vbox);
                this.m_iDeckCount++;
            }
        }
        
        base.appendChild(deck);
        
        this.m_Timer.initWithCallback(this, 
                                      this.m_iTime, 
                                      Components.interfaces.nsITimer.TYPE_REPEATING_SLACK);
    },
    

    createList : function(base, aszNames)
    {
        for(i =0 ; i< aszNames.length; i++)
        {
            base.appendChild(this.processListItem(aszNames[i]));
        }
    },
    
    
    processListItem : function (szData)
    {   
        var aData = szData.split("|");
        var szName = aData[0];
        var szNum = (aData.length>1)? aData[1] : -1;
       
        var hBox = document.createElement("hbox");
        var flagImage = document.createElement("image");
        flagImage.setAttribute("id", "flagImage");
        flagImage.setAttribute("class", "flag");
        flagImage.setAttribute("value", szNum.toString());
        hBox.appendChild(flagImage);
        
        var label = document.createElement("label");
        label.setAttribute("value",szName); 
        label.setAttribute("class", "HttpMailContributorText");
        hBox.appendChild(label);
        
        return hBox;
    },
    
    
    notify : function(timer)
    {
        var deck = document.getElementById("DeckList");
        
        if (this.m_iCurrentDeck != this.m_iDeckCount-1)
            this.m_iCurrentDeck ++;
        else
            this.m_iCurrentDeck=0;
            
        deck.setAttribute("selectedIndex", this.m_iCurrentDeck);
    },
    
    
    stop : function ()
    {
        this.m_Timer.cancel();
    },
};
