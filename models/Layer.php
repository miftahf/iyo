<?php

namespace amilna\iyo\models;

use Yii;

/**
 * This is the model class for table "{{%iyo_layer}}".
 *
 * @property integer $id
 * @property integer $data_id
 * @property string $title
 * @property string $description
 * @property string $remarks
 * @property string $config
 * @property string $tags
 * @property integer $author_id
 * @property integer $type
 * @property integer $status
 * @property string $time
 * @property integer $isdel
 *
 * @property IyoLayDat[] $iyoLayDats
 * @property User $author
 * @property IyoMapLay[] $iyoMapLays
 */
class Layer extends \yii\db\ActiveRecord
{
    /**
     * @inheritdoc
     */
    public static function tableName()
    {
        return '{{%iyo_layer}}';
    }

    /**
     * @inheritdoc
     */
    public function rules()
    {
        return [
            [['data_id', 'author_id', 'type', 'status', 'isdel'], 'integer'],
            [['title', 'description', 'config'], 'required'],
            [['remarks', 'config'], 'string'],
            [['time'], 'safe'],
            [['title'], 'string', 'max' => 65],
            [['description'], 'string', 'max' => 155],
            [['tags'], 'string', 'max' => 255]
        ];
    }

    /**
     * @inheritdoc
     */
    public function attributeLabels()
    {
        return [
            'id' => Yii::t('app', 'ID'),
            'data_id' => Yii::t('app', 'Data ID'),
            'title' => Yii::t('app', 'Title'),
            'description' => Yii::t('app', 'Description'),
            'remarks' => Yii::t('app', 'Remarks'),
            'config' => Yii::t('app', 'Config'),
            'tags' => Yii::t('app', 'Tags'),
            'author_id' => Yii::t('app', 'Author ID'),
            'type' => Yii::t('app', 'Type'),
            'status' => Yii::t('app', 'Status'),
            'time' => Yii::t('app', 'Time'),
            'isdel' => Yii::t('app', 'Isdel'),
        ];
    }	
    
	public function itemAlias($list,$item = false,$bykey = false)
	{
		$lists = [
			/* example list of item alias for a field with name field */	
			'type'=>[							
						0=>Yii::t('app','Data'),							
						//1=>Yii::t('app','TMS'),														
					],			
			'status'=>[							
						0=>Yii::t('app','Draft'),							
						1=>Yii::t('app','Available'),
						2=>Yii::t('app','Private'),
						3=>Yii::t('app','Not Ready'),
					],				
					
		];				
		
		if (isset($lists[$list]))
		{					
			if ($bykey)
			{				
				$nlist = [];
				foreach ($lists[$list] as $k=>$i)
				{
					$nlist[$i] = $k;
				}
				$list = $nlist;				
			}
			else
			{
				$list = $lists[$list];
			}
							
			if ($item !== false)
			{			
				return	(isset($list[$item])?$list[$item]:false);
			}
			else
			{
				return $list;	
			}			
		}
		else
		{
			return false;	
		}
	}    
    

    /**
     * @return \yii\db\ActiveQuery
     */
    public function getLayDat()
    {
        return $this->hasMany(LayDat::className(), ['layer_id' => 'id']);
    }

    /**
     * @return \yii\db\ActiveQuery
     */
    public function getAuthor()
    {
        return $this->hasOne(User::className(), ['id' => 'author_id']);
    }
    
    /**
     * @return \yii\db\ActiveQuery
     */
    public function getData()
    {
        return $this->hasOne(Data::className(), ['id' => 'data_id']);
    }

    /**
     * @return \yii\db\ActiveQuery
     */
    public function getMapLay()
    {
        return $this->hasMany(MapLay::className(), ['layer_id' => 'id']);
    }
    
    public function getTags()
	{
		$models = $this->find()->all();
		$tags = [];
		foreach ($models as $m)
		{
			$ts = explode(",",$m->tags);
			foreach ($ts as $t)
			{	
				if (!in_array($t,$tags))
				{
					$tags[$t] = $t;
				}
			}	
		}
		return $tags;
	}    
}